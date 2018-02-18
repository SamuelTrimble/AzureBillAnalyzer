using AzureBillAnalyzer.Core;
using System;

namespace AzureBillAnalyzer.Models {
	public class MainViewModel {
		public ABASessionData Session { get; set; }
		public string PageClass { get; set; }
		public string PageSection { get; set; }
	}

	public class DashboardViewModel : MainViewModel {
		public Guid BillFile { get; set; }
	}
}