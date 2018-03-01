using AzureBillAnalyzer.Core;
using System;
using System.Diagnostics;
using System.IO;
using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace AzureBillAnalyzer {
	public class MvcApplication : HttpApplication {
		protected void Application_Start() {
			//General
			AreaRegistration.RegisterAllAreas();

			//MVC
			MVCConfig.RegisterGlobalFilters(GlobalFilters.Filters);
			MVCConfig.RegisterRoutes(RouteTable.Routes);
			MVCConfig.RegisterBundles(BundleTable.Bundles);
		}

		protected void Session_Start(object s, EventArgs e) {
			Session.Add("__ABASessionData", ABASession.New());
		}

		protected void Session_End(object s, EventArgs e) {
			ABASessionData sData = (ABASessionData)Session["__ABASessionData"];

			//If the session user uploaded a custom file, delete it when the session ends
			if (!sData.CurrentFile.Equals(Guid.Empty)) {
				string path = System.Web.Hosting.HostingEnvironment.MapPath("~/Content/Uploads" + sData.CurrentFile.ToString() + ".csv");
				if (File.Exists(path)) {
					File.Delete(path);
				}
			}
		}

		protected void Application_BeginRequest(object s, EventArgs e) {
#if !DEBUG
			switch (Request.Url.Scheme) {
				case "https":
					//Use HSTS:
					//http://en.wikipedia.org/wiki/HTTP_Strict_Transport_Security
					Response.AddHeader("Strict-Transport-Security", "max-age=17280000");
					break;
				case "http":
					//Force unsecure connections to redirect
					var path = "https://" + Request.Url.Host + Request.Url.PathAndQuery;
					Response.Status = "301 Moved Permanently";
					Response.AddHeader("Location", path);
					break;
			}
#endif
		}

		protected void Application_EndRequest() {
#if DEBUG
			//Debug '500 Internal Server Error' events here...
			if (this.Context.AllErrors != null) {
				foreach (Exception ex in this.Context.AllErrors) {
					Debug.Write("500 ERROR: " + ex.ToString());
				}
			}
#endif
		}
	}
}
