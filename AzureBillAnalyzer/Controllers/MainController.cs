using AzureBillAnalyzer.Core;
using AzureBillAnalyzer.Models;
using Microsoft.VisualBasic.FileIO;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Linq;
using System.Web.Mvc;

namespace AzureBillAnalyzer.Controllers {
	public class MainController : Controller {

		#region Views
		[HttpGet]
		[Route("")]
		public ActionResult Index() {
			MainViewModel mVM = new MainViewModel() {
				Session = ABASession.Get(),
				PageClass = "index",
				PageSection = "Index"
			};
			
			return View(mVM);
		}

		[HttpGet]
		[Route("about")]
		public ActionResult About() {
			MainViewModel mVM = new MainViewModel() {
				Session = ABASession.Get(),
				PageClass = "about",
				PageSection = "About"
			};

			return View(mVM);
		}

		[HttpGet]
		[Route("dashboard/{file:guid}")]
		public ActionResult Dashboard(Guid file) {
			MainViewModel mVM = new MainViewModel() {
				Session = ABASession.Get(),
				PageClass = "dashboard",
				PageSection = "Dashboard"
			};

			mVM.Session.CurrentFile = file;
			ABASession.Set(mVM.Session);

			return View(mVM);
		}

		[HttpPost]
		[Route("upload")]
		public ActionResult UploadCSV() {
			//Make sure there is only 1 file
			if (Request.Files.Count == 0) {
				return Json(new {
					error = "Invalid File",
					errorMessage = "No file uploaded."
				});
			}
			if (Request.Files.Count > 1) {
				return Json(new {
					error = "Invalid Files",
					errorMessage = "Only 1 file allowed."
				});
			}
			//Only files less than 10MB
			if (Request.Files[0].ContentLength >= 10485760) {
				return Json(new {
					error = "Invalid Size",
					errorMessage = "Only files smaller than 10MB are allowed."
				});
			}

			//Basic file checks passed, save the file & return the new file name
			string folderPath = Server.MapPath("~/Content/Uploads/");
			string fileName = Guid.NewGuid().ToString() + ".csv";

			Directory.CreateDirectory(folderPath);
			Request.Files[0].SaveAs(Path.Combine(folderPath, fileName));

			return Json(new {
				success = true,
				file = fileName
			});
		}
		#endregion

		#region Data
		[HttpPost]
		[Route("processfile")]
		public ActionResult ProcessCurrentFile() {
			ABASessionData sData = ABASession.Get();
			AzureFileData data = new AzureFileData {
				Subscriptions = new List<AzureSubscription>(),
				Services = new List<AzureService>(),
				ResourceGroups = new List<AzureResourceGroup>(),
				Items = new List<AzureDayItem>()
			};
			string currentFilePath = Server.MapPath("~/Content/Uploads/" + sData.CurrentFile.ToString() + ".csv");
			AzureFileSection section = AzureFileSection.None;

			try {
				using (TextFieldParser parser = new TextFieldParser(currentFilePath)) {
					parser.SetDelimiters(new string[] { "," });
					parser.HasFieldsEnclosedInQuotes = true;

					while (!parser.EndOfData) {
						string[] rowData = parser.ReadFields();

						//Kill all extra quotes in cells
						for (int idx = 0; idx < rowData.Length; idx++) {
							rowData[idx] = rowData[idx].Replace("\"", "");
						}

						//Handle empty lines and switching to different sections
						switch (rowData[0]) {
							case "":
								//Empty line, continue to next
								continue;
							case "Provisioning Status":
								//Switch to reading subscriptions
								section = AzureFileSection.Subscriptions;
								//Skip header row
								parser.ReadFields();
								//Continue to subscription data
								continue;
							case "Statement":
								//Switch to reading services
								section = AzureFileSection.Services;
								//Skip header row
								parser.ReadFields();
								//Continue to service data
								continue;
							case "Daily Usage":
								//Switch to reading day items
								section = AzureFileSection.Items;
								//Skip header row
								parser.ReadFields();
								//Continue to day item data
								continue;
						}

						//Parse the current line based on what section we're currently in
						switch (section) {
							case AzureFileSection.Subscriptions:
								AzureSubscription newSub = new AzureSubscription {
									Id = Guid.Parse(rowData[(int)AzureSubscriptionColumns.Id]),
									Name = rowData[(int)AzureSubscriptionColumns.Name],
									Description = rowData[(int)AzureSubscriptionColumns.Description]
								};
								data.Subscriptions.Add(newSub);
								break;
							case AzureFileSection.Services:
								AzureService newService = new AzureService {
									Id = Guid.Empty, //Don't know this yet. For some reason the daily items have a service id but this doesn't, so fill it out later
									Name = rowData[(int)AzureServiceColumns.Name],
									Category = rowData[(int)AzureServiceColumns.Category],
									Subcategory = rowData[(int)AzureServiceColumns.SubCategory],
									Region = rowData[(int)AzureServiceColumns.Region],
									UnitType = rowData[(int)AzureServiceColumns.UnitType],
									TotalConsumedQuantity = decimal.Parse(rowData[(int)AzureServiceColumns.TotalConsumedQuantity]),
									IncludedQuantity = decimal.Parse(rowData[(int)AzureServiceColumns.IncludedQuantity]),
									WithinCommitmentQuantity = decimal.Parse(rowData[(int)AzureServiceColumns.WithinCommitmentQuantity]),
									OverageQuantity = decimal.Parse(rowData[(int)AzureServiceColumns.OverageQuantity]),
									CommitmentRate = decimal.Parse(rowData[(int)AzureServiceColumns.CommitmentRate]),
									OverageRate = decimal.Parse(rowData[(int)AzureServiceColumns.OverageRate]),
									TotalCost = 0m
								};
								//Kinda guessing here. Personally never used the 'commitment' so not sure on how it's charged
								newService.TotalCost = ((newService.WithinCommitmentQuantity * newService.CommitmentRate) + (newService.OverageQuantity * newService.OverageRate));

								data.Services.Add(newService);
								break;
							case AzureFileSection.Items:
								AzureDayItem newItem = new AzureDayItem {
									ServiceId = Guid.Parse(rowData[(int)AzureDayItemColumns.ServiceId]),
									Date = DateTime.ParseExact(rowData[(int)AzureDayItemColumns.Date], "M/d/yyyy", CultureInfo.InvariantCulture),
									InstanceId = rowData[(int)AzureDayItemColumns.ItemInstanceId],
									Consumed = decimal.Parse(rowData[(int)AzureDayItemColumns.ItemConsumedQuantity])
								};

								//Find corresponding service, back-fill service ids as needed
								AzureService itemService = data.Services.SingleOrDefault(s => s.Id.Equals(newItem.ServiceId));
								if (itemService == null) {
									string name = rowData[(int)AzureDayItemColumns.ServiceName],
											category = rowData[(int)AzureDayItemColumns.ServiceCategory],
											subCategory = rowData[(int)AzureDayItemColumns.ServiceSubCategory],
											region = rowData[(int)AzureDayItemColumns.ServiceRegion];
									int idx = data.Services.FindIndex(s => (
																(s.Name.Equals(name, StringComparison.OrdinalIgnoreCase)) &&
																(s.Category.Equals(category, StringComparison.OrdinalIgnoreCase)) &&
																(s.Subcategory.Equals(subCategory, StringComparison.OrdinalIgnoreCase)) &&
																(s.Region.Equals(region, StringComparison.OrdinalIgnoreCase))));

									if (idx != -1) {
										data.Services[idx].Id = newItem.ServiceId;
										itemService = data.Services[idx];
									}
								}

								//Find corresponding resource group, create it if needed
								string groupName = rowData[(int)AzureDayItemColumns.ItemResourceGroupName];
								AzureResourceGroup itemGroup = data.ResourceGroups.SingleOrDefault(g => (g.Name.Equals(groupName, StringComparison.OrdinalIgnoreCase)));
								if (itemGroup == null) {
									itemGroup = new AzureResourceGroup {
										Id = Guid.NewGuid(),
										Name = groupName
									};
									data.ResourceGroups.Add(itemGroup);
								}
								newItem.ResourceGroupId = itemGroup.Id;

								data.Items.Add(newItem);
								break;
						}
					}
				}

				//If the user uploaded a custom file, delete it now that we're done parsing it
				if (!sData.CurrentFile.Equals(Guid.Empty)) {
					if (System.IO.File.Exists(currentFilePath)) {
						System.IO.File.Delete(currentFilePath);
					}
				}
			} catch (Exception ex) {
				//If the user uploaded a custom file, delete it now that we're done parsing it
				if (!sData.CurrentFile.Equals(Guid.Empty)) {
					if (System.IO.File.Exists(currentFilePath)) {
						System.IO.File.Delete(currentFilePath);
					}
				}

				return ErrorJson("CSV Error", "There was an error parsing the supplied .csv file: " + ex.Message);
			}
			
			return Json(data);
		}
		#endregion

		#region ErrorViews
		[HttpGet]
		[AllowAnonymous]
		[Route("Error/{code?}")]
		public ActionResult Error(string code) {
			ViewBag.PageClass = "error";
			ViewBag.PageSection = "error";
			ViewBag.ErrorCode = code;

			return View(ViewPath("Error", "Error"));
		}

		[HttpGet]
		[AllowAnonymous]
		[Route("Error")]
		public ActionResult Error(string type, string msg) {
			if (AjaxRequestExtensions.IsAjaxRequest(Request)) {
				//It's no use to try rendering the error page in an ajax request result
				//Just tell the javascript to do a full redirect to this page
				return RedirectJson("/Error?type=" + type + "&msg=" + msg);
			} else {
				ViewBag.PageClass = "error";
				ViewBag.PageSection = "error";
				ViewBag.ErrorCode = type;
				ViewBag.ErrorMessage = msg;

				return View(ViewPath("Error", "Error"));
			}
		}
		#endregion

		#region Helpers
		public string ViewPath(string folder, string viewName) {
			return "~/Views/" + folder + "/" + viewName + ".cshtml";
		}
		#endregion

		#region JsonResults
		public JsonResult SuccessJson() {
			return Json(new {
				success = "true"
			}, JsonRequestBehavior.AllowGet);
		}
		public JsonResult RedirectJson(string newPath) {
			return Json(new {
				error = "redirect",
				redirectUrl = newPath
			}, JsonRequestBehavior.AllowGet);
		}
		public JsonResult ErrorJson(string err, string msg) {
			return Json(new {
				error = err,
				errorMessage = msg
			}, JsonRequestBehavior.AllowGet);
		}
		#endregion
	}
}