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