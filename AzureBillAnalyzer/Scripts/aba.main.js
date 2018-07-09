/*
********************************************************************************
	Main parent class that all page classes inherit.
	Contains basic shared functionality so code isn't duplicated.
********************************************************************************
*/
class ABA_Main {
	constructor() {
		this._body = document.getElementsByTagName('body')[0];

		this._main = document.getElementById('main');
		this._nav = document.getElementById('mainNav');

		//Handle opening/closing the navigation drawer
		document.getElementById('navHamburger').addEventListener('click', () => {
			let newOpenVal = "";
			if (this._nav.classList.contains('open')) {
				this._nav.classList.remove('open');
				newOpenVal = "false";
			} else {
				this._nav.classList.add('open');
				newOpenVal = "true";
			}

			this.UpdateUserPreference("NavDrawerOpen", newOpenVal);
		});
		this._nav.querySelectorAll('li').forEach((ele) => {
			ele.addEventListener('click', this.Navigate.bind(this));
		});

		//Set currently active nav item
		this._nav.querySelector(`[data-section="${this._body.getAttribute('data-section')}"]`).classList.add('active');
	}

	//Logs data to the console if we're running in 'debug' mode
	Log(str) {
		if (pac_debug) {
			console.log(str);
		}
	}

	//Navigates to the page for the selected navmenu item if a link exists
	Navigate(evt) {
		if (evt.target.getAttribute('data-href').length > 0) {
			window.location.href = evt.target.getAttribute('data-href');
		}
	}

	//Sends message to server to update users specified preference
	async UpdateUserPreference(pref, value) {
		return await this.Post("/Account/UpdatePreference", {
			pref: pref,
			value: value
		});
	}

	//Checks GET/POST results for error messages from the server
	//Returns: BOOL (true if error occurred and was handled here, false otherwise)
	HandleServerErrorResult(result) {
		if (result.error) {
			switch (result.error) {
				case "redirect":
					window.location.href = result.redirect;
					return true;
				default:
					this.Log(result.error + ": " + result.errorMessage);
					return true;
			}
		} else {
			return false;
		}
	}
	//Queries the specified url route
	//Returns: JSON (query result from server, or 'null' if there was an error)
	async Get(route) {
		try {
			let response = await fetch(route, {
				method: 'GET',
				headers: {
					'Content-type': 'application/json'
				}
			});
			let result = await response.json();

			if (!this.HandleServerErrorResult(result)) {
				return result;
			} else {
				return null;
			}
		} catch (err) {
			Log(err.message);

			return null;
		}
	}
	//Queries the specified url route with the specified post data
	//Returns: JSON (query result from server, or 'null' if there was an error)
	async Post(route, data) {
		try {
			let response = await fetch(route, {
				method: 'POST',
				headers: {
					'Accept': 'application/json',
					'Content-type': 'application/json'
				},
				body: JSON.stringify(data)
			});
			let result = await response.json();

			if (!this.HandleServerErrorResult(result)) {
				return result;
			} else {
				return null;
			}
		} catch (err) {
			this.Log(err.message);

			return null;
		}
	}
}

let ABA = null;
let start = function() {
	//When done loading, init the functionality for the current page.
	//Use 'body' class attribute and 'pageClassMap' to init the correct ABA subclass.
	//EX:	if: "<body class='aba-page-dashboard'>" then: "ABA = new ABA_Dashboard();"
	let pageClass = document.getElementsByTagName('body')[0].className.split('-')[2],
		pageClassMap = {
			'index': ABA_Index,
			'dashboard': ABA_Dashboard,
			'about': ABA_About,
			'error': ABA_Error
		};

	ABA = new pageClassMap[pageClass]();
};
if ((document.readyState === "complete") || ((document.readyState !== "loading") && (!document.documentElement.doScroll))) {
	start();
} else {
	document.addEventListener("DOMContentLoaded", start);
}
