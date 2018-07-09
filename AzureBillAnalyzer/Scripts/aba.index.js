class ABA_Index extends ABA_Main {
	constructor() {
		super();

		this._form = document.getElementById('fileForm');
		this._file = document.getElementById('fileField');
		this._dropTarget = document.getElementById('dropTarget');
		this._dropZoneVisible = false;
		this._dropZoneTimer = null;
		this._progress = document.getElementById('progress');
		this._error = document.getElementById('uploadError');

		//Handle UI for the file drop zone
		['dragstart', 'dragenter', 'dragover'].forEach((evt) => {
			document.addEventListener(evt, this.MouseDraggingStarted.bind(this));
		});
		['drop', 'dragleave', 'dragend'].forEach((evt) => {
			document.addEventListener(evt, this.MouseDraggingStopped.bind(this));
		});
		
		this._dropTarget.addEventListener('click', (evt) => { this._file.click(); });
		this._dropTarget.addEventListener('drop', this.FileSelected.bind(this));
		['change', 'drop'].forEach((evt) => {
			this._file.addEventListener(evt, this.FileSelected.bind(this));
		});
	}
	MouseDraggingStarted(evt) {
		//If a file is being dragged over the document
		if (evt.dataTransfer.types.includes('Files')) {
			evt.stopPropagation();
			evt.preventDefault();

			//Highlight our drop zone
			this._dropTarget.classList.add('active');
			this._dropZoneVisible = true;

			//Only show the 'copy' cursor when the cursor is over the drop zone
			if ((evt.target.getAttribute('id') === "dropTarget") || (evt.target.getAttribute('id') === "fileField")) {
				evt.dataTransfer.effectAllowed = 'copyMove';
				evt.dataTransfer.dropEffect = 'copy';
			} else {
				evt.dataTransfer.effectAllowed = 'none';
				evt.dataTransfer.dropEffect = 'none';
			}
		}
	}
	MouseDraggingStopped(evt) {
		//No more files are being dragged over the document, so reset the UI
		this._dropZoneVisible = false;

		//Use a short timer to prevent rapid on/off/on/off events
		if (this._dropZoneTimer !== null) {
			clearTimeout(this._dropZoneTimer);
		}
		this._dropZoneTimer = setTimeout(() => {
			if (!this._dropZoneVisible) {
				this._dropTarget.classList.remove('active');
			}
			this._dropZoneTimer = null;
		}, 100);
	}

	async FileSelected(evt) {
		let formData = null,
			files = null;

		//Don't let the browser try to handle the file
		evt.stopPropagation();
		evt.preventDefault();

		//Clear any previous errors
		this._error.classList.add('hidden');

		//Called from manual file selection or drag & drop, check both event types to get the file
		if ((evt.target.files) && (evt.target.files.length > 0)) {
			files = evt.target.files;
		} else if ((evt.dataTransfer.files) && (evt.dataTransfer.files.length > 0)) {
			files = evt.dataTransfer.files;
		}

		if (files === null) {
			return;
		}
		if (files.length > 1) {
			this._error.innerHTML = "Only 1 file at a time please";
			this._error.classList.remove('hidden');
			return;
		}
		switch (files[0].type) {
			case "text/csv":
			case "application/vnd.ms-excel":
				break;
			default:
				this._error.innerHTML = "Only .csv bills from Azure please";
				this._error.classList.remove('hidden');
				return;
		}

		//Passed initial file checks, start uploading
		this._progress.classList.remove('hidden');

		formData = new FormData();
		formData.append(files[0].name, files[0]);

		try {
			let response = await fetch(this._form.getAttribute('action'), {
				method: 'POST',
				body: formData
			});
			let result = await response.json();

			if (result.error) {
				this._form.reset();

				this._error.innerHTML = `${result.error}: ${result.errorMessage}`;
				this._error.classList.remove('hidden');

				this._progress.classList.add('hidden');
			} else if (result.success) {
				window.location.href = `/dashboard/${result.file.split(".")[0]}`;
			}
		} catch (err) {
			this.Log(err.message);
		}
	}
}