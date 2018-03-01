/*
********************************************************************************
	Main parent class that all page classes inherit.
	Contains basic shared functionality so code isn't duplicated.
********************************************************************************
*/
class ABA_Main {
	constructor() {
		this._$window = $(window);
		this._$document = $(document);
		this._$body = $('body');
		this._$main = $('#main');

		this._$nav = $('#mainNav');

		//Handle main navigation drawer events
		this._$nav
			.on('click', '#hamburger', this.ToggleNavDrawer.bind(this))
			.on('click', 'li', this.Navigate.bind(this));

		//Set currently active nav item
		this._$nav.find('[data-section="' + this._$body.data('section') + '"]').addClass('active');
	}

	ToggleNavDrawer(evt) {
		this._$nav.toggleClass('open');

		this.UpdateUserPreference("NavDrawerOpen", ((this._$nav.hasClass('open')) ? "true" : "false"));
	}
	Navigate(evt) {
		let $target = $(evt.target);

		if ($target.data('href').length > 0) {
			window.location.href = $target.data('href');
		}
	}

	UpdateUserPreference(pref, value) {
		$.ajax({
			url: "/Account/UpdatePreference",
			type: 'POST',
			data: JSON.stringify({
				pref: pref,
				value: value
			}),
			cache: false,
			contentType: "application/json; charset=utf-8"
		});
	}

	BuildInlineErrorMessage(title, message) {
		return "<h2 class='error'>" + title + "</h2><p class='error'>" + message + "</p>";
	}
}

var ABA = null;
$(document).ready(function() {
	//When done loading, init the functionality for the current page.
	//Use 'body' class attribute and 'pageClassMap' to init the correct ABA subclass.
	//EX:	if: "<body class='aba-page-dashboard'>" then: "ABA = new ABA_Dashboard();"
	let pageClass = $('body').attr('class').split('-')[2],
		pageClassMap = {
			'index': ABA_Index,
			'dashboard': ABA_Dashboard,
			'about': ABA_About,
			'error': ABA_Error
		};

	ABA = new pageClassMap[pageClass]();
});