class ABA_Index extends ABA_Main {
	constructor() {
		super();

		this._$form = $('#fileForm');
		this._$file = $('#fileField');
		this._$dropTarget = $('#dropTarget');
		this._dropZoneVisible = false;
		this._dropZoneTimer = null;
		this._$progress = $('#progress');
		this._$error = $('#uploadError');

		let _self = this;

		//Handle the UI for the file drop zone
		this._$document
			.on('dragstart dragenter dragover', function(evt) {
				//If the user is dragging a file over the 'document'
				if ($.inArray("Files", evt.originalEvent.dataTransfer.types) > -1) {
					evt.stopPropagation();
					evt.preventDefault();

					//Highlight our drop zone
					_self._$dropTarget.addClass('active');
					_self._dropZoneVisible = true;

					//Only show the 'copy' cursor when the cursor is over the drop zone
					evt.originalEvent.dataTransfer.effectAllowed = 'none';
					evt.originalEvent.dataTransfer.dropEffect = 'none';

					if (($(evt.target).attr('id') === "dropTarget") || ($(evt.target).attr('id') === "fileField")) {
						evt.originalEvent.dataTransfer.effectAllowed = 'copyMove';
						evt.originalEvent.dataTransfer.dropEffect = 'copy';
					}
				}
			})
			.on('drop dragleave dragend', function(evt) {
				//No more files are being dragged over the 'document', so reset the UI
				_self._dropZoneVisible = false;

				//Use a short timer to prevent rapid on/off/on/off/etc events
				if (_self._dropZoneTimer !== null) {
					clearTimeout(_self._dropZoneTimer);
				}
				_self._dropZoneTimer = setTimeout(function() {
					if (!_self._dropZoneVisible) {
						_self._$dropTarget.removeClass('active');
					}
					_self._dropZoneTimer = null;
				}, 100);
			});

		this._$dropTarget
			.click(e => { _self._$file.click(); })
			.on('drop', this.FileSelected.bind(this));
		this._$file
			.on('change drop', this.FileSelected.bind(this));
	}

	FileSelected(evt) {
		let _self = this,
			formData = null,
			files = null;

		if ((evt.target.files) && (evt.target.files.length > 0)) {
			files = evt.target.files;
		} else if ((evt.originalEvent.dataTransfer.files) && (evt.originalEvent.dataTransfer.files.length > 0)) {
			files = evt.originalEvent.dataTransfer.files;
		}

		this._$error.addClass('hidden');

		evt.stopPropagation();
		evt.preventDefault();

		if (files === null) {
			return;
		}
		if (files.length > 1) {
			this._$error
				.text("only 1 file please")
				.removeClass('hidden');
			return;
		}
		
		switch (files[0].type) {
			case "text/csv":
			case "application/vnd.ms-excel":
				break;
			default:
				this._$error
					.text("only .csv bills from Azure please")
					.removeClass('hidden');
				return;
		}

		//Passed initial file checks, start uploading
		this._$progress.removeClass('hidden');

		formData = new FormData();
		formData.append(files[0].name, files[0]);

		$.ajax({
			url: this._$form.attr('action'),
			type: 'POST',
			data: formData,
			cache: false,
			processData: false,
			contentType: false
		}).done(function(result, statusText, jqXHR) {
			console.log(result);
			if (result.error) {
				_self._$form[0].reset();

				_self._$error
					.text(result.error + ": " + result.errorMessage)
					.removeClass('hidden');

				_self._$progress.addClass('hidden');
			} else if (result.success) {
				window.location.href = "/dashboard/" + result.fileName.split(".")[0];
			}
		});
	}
}