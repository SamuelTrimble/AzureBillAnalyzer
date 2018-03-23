class ABA_Dashboard extends ABA_Main {
	constructor() {
		super();

		this._$dashboard = $('#dashboard');
		this._$overview = $('#overview');

		this._curGrouping = "Resource Groups";
		this._$monthGrouping = $('#dashboard-monthGroupingDropdown');
		this._$monthGraph = $('#dashboard-monthGraph');
		this._monthGraphContext = this._$monthGraph[0].getContext('2d');
		this._monthGraphChart = null;
		this._monthGraphChartOptions = {
			responsive: true,
			legend: {
				position: 'top'
			},
			title: {
				display: true,
				text: "Cost by day"
			},
			tooltips: {
				mode: 'index',
				intersect: false,
				callbacks: {
					label: function(tooltipItem, data) {
						let label = data.datasets[tooltipItem.datasetIndex].label || "";
						if (label) {
							label += ": ";
						}
						label += "$" + tooltipItem.yLabel.toFixed(2);
						return label;
					}
				}
			},
			scales: {
				xAxes: [{
					stacked: true
				}],
				yAxes: [{
					stacked: true,
					ticks: {
						callback: function(value, idx, values) { return "$" + value; }
					}
				}]
			}
		};

		this._$groupTotalGraph = $('#dashboard-groupTotalGraph');
		this._groupTotalGraphContext = this._$groupTotalGraph[0].getContext('2d');
		this._groupTotalChart = null;
		this._groupTotalChartOptions = {
			responsive: true,
			legend: {
				display: false
			},
			title: {
				display: true,
				text: "Resource Group total cost"
			},
			tooltips: {
				mode: 'point',
				callbacks: {
					label: function(tooltipItem, data) {
						let label = data.labels[tooltipItem.index] || "";
						if (label) {
							label += ": ";
						}
						label += "$" + data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
						return label;
					}
				}
			}
		};

		this._$serviceTotalGraph = $('#dashboard-serviceTotalGraph');
		this._serviceTotalGraphContext = this._$serviceTotalGraph[0].getContext('2d');
		this._serviceTotalChart = null;
		this._serviceTotalChartOptions = {
			responsive: true,
			legend: {
				display: false
			},
			title: {
				display: true,
				text: "Service total cost"
			},
			tooltips: {
				mode: 'point',
				callbacks: {
					label: function(tooltipItem, data) {
						let label = data.labels[tooltipItem.index] || "";
						if (label) {
							label += ": ";
						}
						label += "$" + data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
						return label;
					}
				}
			}
		};

		this._data = null;
		this._graphDates = [];
		this._graphColors = [
			"#276CB9",
			"#B6D957",
			"#FAC364",
			"#8CD3FF",
			"#D998CB",
			"#F2D249",
			"#93B9C6",
			"#CCC5A8",
			"#52BACC",
			"#DBDB46",
			"#98AAFB",
			"#F66364"
		];

		//Handle UI events while keeping class scope of 'this'
		this._$monthGrouping.on('click', 'li', this.ChangeMonthGraphGrouping.bind(this));

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

				this.BuildGraphDates();

				this.BuildMonthGraph();
				this.BuildGroupTotalGraph();
				this.BuildServiceTotalGraph();
			}

			this._$main.removeClass('loadingBackground');
		});
	}

	ComputeBillTotal() {
		//JS is notoriously inaccurate with floating point math, use 'decimal.js' library
		let total = new Decimal(0);
		this._data.Services.forEach((item) => { total = total.plus(item.TotalCost); });

		let content = `Bill Total: ${total.toFixed(2)} <small>(without tax)</small>`;
		this._$dashboard.find('#dashboard-total').html(content);
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

	BuildGraphDates() {
		this._data.Items.forEach((item, idx) => {
			//.NET Dates come in as: "/Date(1514707200000)/", we just want the int between the parentheses
			let itemDateInt = parseInt(item.Date.slice(item.Date.indexOf("(") + 1, item.Date.lastIndexOf(")"))),
				itemDate = new Date(itemDateInt),
				exists = false;

			//Add this date to the array if it doesn't already exist
			this._graphDates.forEach((date) => {
				if (date.getTime() === itemDateInt) {
					exists = true;
					return;
				}
			});
			if (!exists) {
				this._graphDates.push(itemDate);
			}

			//Replace this item, so later on we just have the int we need
			this._data.Items[idx].Date = itemDateInt;
		});
		this._graphDates.sort((a, b) => a - b);
	}

	GetGraphColorByIndex(idx) {
		while (idx > this._graphColors.length) {
			idx -= this._graphColors.length;
		}
		return this._graphColors[idx];
	}

	ChangeMonthGraphGrouping(evt) {
		let selItem = $(evt.target),
			allItems = this._$monthGrouping.find('li'),
			newGrouping = selItem.data('grouping'),
			label = this._$monthGrouping.find('label');

		//Update dropdown UI
		label.text(`Group by: ${newGrouping}`);
		allItems.removeClass('active');
		selItem.addClass('active');

		//Rebuild graph
		this._curGrouping = newGrouping;
		this.BuildMonthGraph();
	}
	BuildMonthGraph() {
		let chartData = {};

		chartData.labels = [];
		this._graphDates.forEach((date) => {
			chartData.labels.push(date.toLocaleDateString('en-US', {
				day: 'numeric',
				month: 'short'
			}));
		});

		chartData.datasets = [];
		switch (this._curGrouping) {
			case "Subscriptions":
				break;
			case "Resource Groups":
				this._data.ResourceGroups.forEach((group, idx) => {
					let groupColor = this.GetGraphColorByIndex(idx),
						groupDataSet = {
							label: group.Name,
							backgroundColor: groupColor,
							borderWidth: 0,
							data: []
						},
						groupCost = new Decimal(0);

					//Data items are totals by date
					this._graphDates.forEach((date) => {
						let curDateInt = date.getTime(),
							dateCost = new Decimal(0);

						this._data.Items.forEach((item) => {
							//Find items with matching group ids and date
							if ((item.ResourceGroupId === group.Id) && (item.Date === curDateInt)) {
								//Find the matching service for this item
								this._data.Services.forEach((service) => {
									if (service.Id === item.ServiceId) {
										dateCost = dateCost.plus(new Decimal(service.OverageRate).times(new Decimal(item.Consumed)));
									}
								});
							}
						});

						groupCost = groupCost.plus(dateCost);
						groupDataSet.data.push(dateCost.toFixed(2));
					});

					//Exclude resource groups that didn't cost anything
					if (groupCost.comparedTo(0) === 1) {
						chartData.datasets.push(groupDataSet);
					}
				});
				break;
			case "Services":
				this._data.Services.forEach((service, idx) => {
					let serviceColor = this.GetGraphColorByIndex(idx),
						serviceDataSet = {
							label: service.Category + " / " + service.Name + ((service.Region.length > 0) ? " / " + service.Region : ""),
							backgroundColor: serviceColor,
							borderWidth: 0,
							data: []
						},
						serviceCost = new Decimal(0);

					//Data items are totals by date
					this._graphDates.forEach((date) => {
						let curDateInt = date.getTime(),
							dateCost = new Decimal(0);

						this._data.Items.forEach((item) => {
							//Find items with matching service ids and date
							if ((item.ServiceId === service.Id) && (item.Date === curDateInt)) {
								dateCost = dateCost.plus(new Decimal(service.OverageRate).times(new Decimal(item.Consumed)));
							}
						});

						serviceCost = serviceCost.plus(dateCost);
						serviceDataSet.data.push(dateCost.toFixed(2));
					});

					//Exclude services that didn't cost anything
					if (serviceCost.comparedTo(0) === 1) {
						chartData.datasets.push(serviceDataSet);
					}
				});
				break;
		}

		if (this._monthGraphChart === null) {
			this._monthGraphChart = new Chart(this._monthGraphContext, {
				type: 'bar',
				data: chartData,
				options: this._monthGraphChartOptions
			});
		} else {
			this._monthGraphChart.data = chartData;
			this._monthGraphChart.update();
		}
	}

	BuildGroupTotalGraph() {
		let chartData = {
			labels: [],
			datasets: [{
				data: [],
				backgroundColor: []
			}]
		};

		this._data.ResourceGroups.forEach((group, idx) => {
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

			//Exclude resource groups that didn't cost anything
			if (itemCost.comparedTo(0) === 1) {
				chartData.labels.push(group.Name);
				chartData.datasets[0].data.push(itemCost.toFixed(2));
				chartData.datasets[0].backgroundColor.push(this.GetGraphColorByIndex(idx));
			}
		});

		if (this._groupTotalChart === null) {
			this._groupTotalChart = new Chart(this._groupTotalGraphContext, {
				type: 'doughnut',
				data: chartData,
				options: this._groupTotalChartOptions
			});
		} else {
			this._groupTotalChart.data = chartData;
			this._groupTotalChart.update();
		}
	}
	BuildServiceTotalGraph() {
		let chartData = {
			labels: [],
			datasets: [{
				data: [],
				backgroundColor: []
			}]
		};

		this._data.Services.forEach((service, idx) => {
			let itemCost = new Decimal(service.TotalCost);

			//Exclude services that didn't cost anything
			if (itemCost.comparedTo(0) === 1) {
				chartData.labels.push(service.Category + " / " + service.Name + ((service.Region.length > 0) ? " / " + service.Region : ""));
				chartData.datasets[0].data.push(itemCost.toFixed(2));
				chartData.datasets[0].backgroundColor.push(this.GetGraphColorByIndex(idx));
			}
		});

		if (this._serviceTotalChart === null) {
			this._serviceTotalChart = new Chart(this._serviceTotalGraphContext, {
				type: 'doughnut',
				data: chartData,
				options: this._serviceTotalChartOptions
			});
		} else {
			this._serviceTotalChart.data = chartData;
			this._serviceTotalChart.update();
		}
	}
}