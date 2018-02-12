using System.Web;
using System.Web.Mvc;
using System.Web.Optimization;
using System.Web.Routing;

namespace AzureBillAnalyzer {
	public class MVCConfig {
		public static void RegisterGlobalFilters(GlobalFilterCollection filters) {
			filters.Add(new HandleErrorAttribute());
			filters.Add(new RequireHttpsAttribute());
		}

		public static void RegisterRoutes(RouteCollection routes) {
			routes.IgnoreRoute("{resource}.axd/{*pathInfo}");

			routes.MapMvcAttributeRoutes();
		}

		public const string bundledScripts = "~/scriptBundle";
		public const string bundledStyles = "~/styleBundle";

		public static void RegisterBundles(BundleCollection bundles) {
			bundles.Add(new ScriptBundle(bundledScripts).Include(
				"~/Libraries/jQuery/jquery-3.3.1.min.js",
				"~/Scripts/aba.main.js",
				"~/Scripts/aba.index.js",
				"~/Scripts/aba.dashboard.js",
				"~/Scripts/aba.about.js",
				"~/Scripts/aba.error.js"
			));
			bundles.Add(new StyleBundle(bundledStyles).Include(
				"~/Styles/Compiled/aba.main.css",
				"~/Styles/Compiled/aba.index.css",
				"~/Styles/Compiled/aba.dashboard.css",
				"~/Styles/Compiled/aba.about.css",
				"~/Styles/Compiled/aba.error.css"
			));

			//Force bundling except for debug builds
#if DEBUG
			BundleTable.EnableOptimizations = false;
#else
			BundleTable.EnableOptimizations = true;
#endif
		}
	}
}
