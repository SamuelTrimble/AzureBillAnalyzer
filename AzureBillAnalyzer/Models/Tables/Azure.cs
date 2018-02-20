using System;
using System.Collections.Generic;

namespace AzureBillAnalyzer.Models {
	public enum AzureFileSection {
		None,
		Subscriptions,
		Services,
		Items
	}
	public enum AzureSubscriptionColumns {
		Id = 0,
		Name,
		OrderId,
		Description,
		BillingDate,
		OfferName,
		ServiceName,
		Status,
		ExtraStatus,
		ProvisioningStatus
	}
	public enum AzureServiceColumns {
		BillingPeriod = 0,
		Category,
		SubCategory,
		Name,
		Region,
		SKU,
		UnitType,
		TotalConsumedQuantity,
		IncludedQuantity,
		WithinCommitmentQuantity,
		OverageQuantity,
		ChargeCurrency,
		Overage, /*No idea what this column is for...*/
		CommitmentRate,
		OverageRate,
		TotalCost
	}
	public enum AzureDayItemColumns {
		Date = 0,
		ServiceCategory,
		ServiceId,
		ServiceSubCategory,
		ServiceName,
		ServiceRegion,
		ServiceUnitType,
		ItemConsumedQuantity,
		ItemResourceLocation,
		ServiceType,
		ItemResourceGroupName,
		ItemInstanceId,
		ItemTags,
		ItemAdditionalInfo,
		ServiceInfo1,
		ServiceInfo2
	}
	public class AzureFileData {
		public List<AzureSubscription> Subscriptions { get; set; }
		public List<AzureService> Services { get; set; }
		public List<AzureResourceGroup> ResourceGroups { get; set; }
		public List<AzureDayItem> Items { get; set; }
	}

	public class AzureSubscription {
		public Guid Id { get; set; }
		public string Name { get; set; }
		public string Description { get; set; }
	}
	public class AzureService {
		public Guid Id { get; set; }
		public string Name { get; set; }
		public string Category { get; set; }
		public string Subcategory { get; set; }
		public string Region { get; set; }
		public string UnitType { get; set; }
		public decimal TotalConsumedQuantity { get; set; }
		public decimal IncludedQuantity { get; set; }
		public decimal WithinCommitmentQuantity { get; set; }
		public decimal OverageQuantity { get; set; }
		public decimal CommitmentRate { get; set; }
		public decimal OverageRate { get; set; }
		public decimal TotalCost { get; set; }
	}
	public class AzureResourceGroup {
		public Guid Id { get; set; }
		public string Name { get; set; }
	}
	public class AzureDayItem {
		public Guid ServiceId { get; set; }
		public Guid ResourceGroupId { get; set; }
		public DateTime Date { get; set; }
		public string InstanceId { get; set; }
		public decimal Consumed { get; set; }
	}
}