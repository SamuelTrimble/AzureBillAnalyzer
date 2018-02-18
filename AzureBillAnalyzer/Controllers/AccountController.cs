using AzureBillAnalyzer.Core;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.Mvc;

namespace AzureBillAnalyzer.Controllers {
	public class AccountController : MainController {

		#region AccountData
		[HttpPost]
		[Route("Account/UpdatePreference")]
		public JsonResult UpdatePreference(string pref, string value) {
			ABASessionData sData = ABASession.Get();

			try {
				sData[pref] = value;
				ABASession.Set(sData);
			} catch {
				//Ignore errors setting preferences, not very important
			}

			return SuccessJson();
		}
		#endregion
	}
}