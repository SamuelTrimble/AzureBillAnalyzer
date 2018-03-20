class ABA_Dashboard extends ABA_Main {
	constructor() {
		super();

		this._$overview = $('#overview');
		this._$dashboard = $('#dashboard');

		this._data = null;

		//Page is now loaded, kick off processing
		//This may take some time with large files... maybe implement a SignalR interface later for incremental progress updates?
		this._$main.addClass('loadingBackground');

		$.ajax({
			url: "/processfile",
			type: 'POST',
			cache: false
		}).done((result, statusText, jqXHR) => {
			console.log(result);

			if (result.error) {
				this._$dashboard.append(_self.BuildInlineErrorMessage(result.error, result.errorMessage));
				this._$dashboard.append("<p class='error'>Make sure to upload a valid v2 Azure csv bill.</p>");
			} else {
				this._data = result;

				this._data.Subscriptions.sort((a, b) => a.Name.localeCompare(b.Name));
				this._data.ResourceGroups.sort((a, b) => a.Name.localeCompare(b.Name));
				this._data.Services.sort((a, b) => a.Name.localeCompare(b.Name));

				this.ComputeBillTotal();
				this.ListSubscriptions();
				this.ListResourceGroups();
				this.ListServices();
			}

			this._$main.removeClass('loadingBackground');
		});
	}

	ComputeBillTotal() {
		//JS is notoriously inaccurate with floating point math, use 'decimal.js' library
		let total = new Decimal(0);
		this._data.Services.forEach((item) => { total = total.plus(item.TotalCost); });

		let content = `Bill Total: ${total.toFixed(2)} <small>(without tax)</small>`;
		this._$overview.find('#overview-total').html(content);
	}
	ListSubscriptions() {
		let content = "";

		this._data.Subscriptions.forEach((item) => {
			//Unable to get a total cost at the moment... Maybe in the future?
			//Subscription ids in the line items do not match the main id of the subscription...
			let itemContent = `
				<li class='listRow'>
					<span class='listCol id monofont'>${item.Id}</span>
					<span class='listCol name'>${item.Name}</span>
					<span class='listCol desc'>${item.Description}</span>
				</li>
				`.trim();

			content += itemContent;
		});

		this._$overview.find('#subscriptionList').html(content);
	}
	ListResourceGroups() {
		let content = "";

		this._data.ResourceGroups.forEach((group) => {
			let itemCost = new Decimal(0);
			this._data.Items.forEach((item) => {
				//Find line items with matching group ids
				if (item.ResourceGroupId === group.Id) {
					//Find the matching service for this line item
					this._data.Services.forEach((service) => {
						if (service.Id === item.ServiceId) {
							itemCost = itemCost.plus(new Decimal(service.OverageRate).times(new Decimal(item.Consumed)));
						}
					});
				}
			});
			let itemContent = `
				<li class='listRow'>
					<span class='listCol id monofont'>${group.Id}</span>
					<span class='listCol name'>${group.Name}</span>
					<span class='listCol cost'>$${itemCost.toFixed(2)}</span>
				</li>
			`.trim();

			content += itemContent;
		});

		this._$overview.find('#groupList').html(content);
	}
	ListServices() {
		let content = "";

		this._data.Services.forEach((service) => {
			let itemCost = new Decimal(service.TotalCost);

			//Exclude services that don't cost anything
			if (itemCost.comparedTo(0) === 1) {
				let itemContent = `
					<li class='listRow'>
						<span class='listCol id monofont'>${service.Id}</span>
						<span class='listCol name'>${service.Name}</span>
						<span class='listCol category'>${service.Category}</span>
						<span class='listCol subcategory'>${service.Subcategory}</span>
						<span class='listCol region'>${service.Region}</span>
						<span class='listCol cost'>$${itemCost.toFixed(2)}</span>
					</li>
				`.trim();

				content += itemContent;
			}
		});

		this._$overview.find('#serviceList').html(content);
	}
}