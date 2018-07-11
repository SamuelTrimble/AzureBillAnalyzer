using System;
using System.Reflection;
using System.Web;

namespace AzureBillAnalyzer.Core {
	public class ABASessionData {
		//Current user identity & preferences
		public bool IsUserValidated;
		public bool NavDrawerOpen;

		public Guid CurrentFile;

		//Virtual object to access session data object field by string name: (sData["CurrentFile"] = fileNameStr;)
		public virtual object this[string prop] {
			get {
				Type t = typeof(ABASessionData);
				FieldInfo fI = t.GetField(prop);

				return fI.GetValue(this);
			}
			set {
				Type t = typeof(ABASessionData);
				FieldInfo fI = t.GetField(prop);

				switch (fI.FieldType.Name) {
					case "Boolean":
						fI.SetValue(this, bool.Parse((string)value));
						break;
					case "Guid":
						fI.SetValue(this, Guid.Parse((string)value));
						break;
				}
			}
		}
	}
	public class ABASession {
		public static ABASessionData New() {
			ABASessionData sData = new ABASessionData();

			sData.IsUserValidated = false;
			sData.NavDrawerOpen = false;
			sData.CurrentFile = Guid.Empty;

			return sData;
		}
		public static ABASessionData Get() {
			if (HttpContext.Current != null) {
				return Get(HttpContext.Current);
			} else {
				return null;
			}
		}
		public static ABASessionData Get(HttpContext context) {
			if (context.Session["__ABASessionData"] != null) {
				return (ABASessionData)context.Session["__ABASessionData"];
			} else {
				return null;
			}
		}
		public static void Set(ABASessionData sData) {
			if (HttpContext.Current != null) {
				HttpContext.Current.Session["__ABASessionData"] = sData;
			}
		}
	}
}