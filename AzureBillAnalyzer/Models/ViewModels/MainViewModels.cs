using AzureBillAnalyzer.Core;

namespace AzureBillAnalyzer.Models {
	public class MainViewModel {
		public ABASessionData Session { get; set; }
		public string PageClass { get; set; }
		public string PageSection { get; set; }
	}
}