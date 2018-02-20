class ABA_Dashboard extends ABA_Main {
	constructor() {
		super();

		this._$container = $('#dashboard');

		let _self = this;

		//Page is now loaded, kick off processing
		//This may take some time with large files... maybe implement a SignalR interface later for incremental progress updates?
		$.ajax({
			url: "/processfile",
			type: 'POST',
			cache: false
		}).done(function(result, statusText, jqXHR) {
			console.log(result);
		});
	}
}