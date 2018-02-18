using AzureBillAnalyzer.Core;
using AzureBillAnalyzer.Models;
using System;
using System.IO;
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