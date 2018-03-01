class ABA_Dashboard extends ABA_Main {
	constructor() {
		super();

		this._$overview = $('#overview');
		this._$dashboard = $('#dashboard');

		this._data = null;

		let _self = this;

		//Page is now loaded, kick off processing
		//This may take some time with large files... maybe implement a SignalR interface later for incremental progress updates?
		this._$main.addClass('loadingBackground');

		$.ajax({
			url: "/processfile",
			type: 'POST',
			cache: false
		}).done(function(result, statusText, jqXHR) {
			console.log(result);

			if (result.error) {
				_self._$dashboard.append(_self.BuildInlineErrorMessage(result.error, result.errorMessage));
				_self._$dashboard.append("<p class='error'>Make sure to upload a valid v2 Azure csv bill.</p>");
			} else {
				_self._data = result;

				_self.ComputeBillTotal();
				_self.ListSubscriptions();
				_self.ListResourceGroups();
				_self.ListServices();
			}

			_self._$main.removeClass('loadingBackground');
		});
	}

	ComputeBillTotal() {
		//JS is notoriously inaccurate with floating point math, use 'decimal.js' library
		let total = new Decimal(0),
			template = "Bill Total: ${amt} <small>(without tax)</small>",
			content = "";

		this._data.Services.forEach((item) => total = total.plus(item.TotalCost));

		content = template.replace("{amt}", total.toFixed(2));
		this._$overview.find('#overview-total').html(content);
	}
	ListSubscriptions() {
		let rowTempate =
			"<li class='subscriptionRow'>" +
				"<span class='subscriptionCol id monofont'>{id}</span>" +
				"<span class='subscriptionCol name'>{name}</span>" +
				"<span class='subscriptionCol desc'>{desc}</span>" +
				//"<span class='subscriptionCol cost'>{cost}</span>" +
			"</li>",
			content = "";

		this._data.Subscriptions.forEach(function(item) {
			let itemContent = rowTempate.replace("{name}", item.Name);
			itemContent = itemContent.replace("{desc}", item.Description);
			itemContent = itemContent.replace("{id}", item.Id);

			//Unable to get this at the moment... Maybe in the future?
			//Subscription ids in line items do not match the main id of the subscription...
			//itemContent = itemContent.replace("{cost}", "");

			content += itemContent;
		});

		this._$overview.find('#subscriptionList').html(content);
	}
	ListResourceGroups() {
		let rowTempate =
			"<li class='groupRow'>" +
				"<span class='groupCol id monofont'>{id}</span>" +
				"<span class='groupCol name'>{name}</span>" +
				"<span class='groupCol cost'>{cost}</span>" +
			"</li>",
			content = "",
			_self = this;

		this._data.ResourceGroups.forEach(function(group) {
			let itemContent = rowTempate.replace("{name}", group.Name);
			itemContent = itemContent.replace("{id}", group.Id);

			let itemCost = new Decimal(0);
			_self._data.Items.forEach(function(item) {
				//Find line items with matching group ids
				if (item.ResourceGroupId === group.Id) {
					//Find the matching service for this line item
					_self._data.Services.forEach(function(service) {
						if (service.Id === item.ServiceId) {
							itemCost = itemCost.plus(new Decimal(service.OverageRate).times(new Decimal(item.Consumed)));
						}
					});
				}
			});
			itemContent = itemContent.replace("{cost}", "$" + itemCost.toFixed(2));

			content += itemContent;
		});

		this._$overview.find('#groupList').html(content);
	}
	ListServices() {
		
	}
}