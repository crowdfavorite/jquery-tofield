/*
 * jQuery To: Field plugin 1.0
 *
 * @todo: add real links
 * http://crowdfavorite.com/
 * http://docs.jquery.com/Plugins/ToField
 *
 * Copyright (c) 2009 Crowd Favorite
 *
 * $Id$
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

;(function($) {
	$.fn.toField = function(options) {
		
		// build main options before element iteration
		var opts = $.extend({}, $.fn.toField.defaults, options);

		// iterate over matched elements
		return this.each(function() {
			// build element specific options
			var o = $.meta ? $.extend({}, opts, $(this).data()) : opts;
			var toField = new ToField($(this), o);
		});
	};

	$.fn.toField.defaults = {
		contacts: [],
		maxTokenRows: 4,
		maxSuggestions: 10,
		adHoc: false,
		search: $.fn.toField.search,
		sort: $.fn.toField.sort
	};	

	// simple observer pattern
	var Observable = {
		observers: {},
		addObserver: function(eventName, f) {
			if (!this.observers[eventName]) {
				this.observers[eventName] = [];
			}
			this.observers[eventName].push(f);
			return f;
		},
		removeObserver: function(eventName, f) {
			if (this.observers[eventName]) {
				var observers = this.observers[eventName];
				for (var i = 0; i < observers.length; i++) {
					if (observers[i] == f) {
						break;
					}
				}
				this.observers[eventName].splice(i, 1);
			}
		},
		notifyObservers: function(eventName, arg, synch) {
			//if (!(typeof args == 'object') || !('length' in args)) {
			//	args = [args];
			//}
			if (eventName in this.observers) {
				var observers = this.observers[eventName];
				for (var i = 0; i < observers.length; i++) {
					if (synch) {
						observers[i].apply(observers[i], [arg]);
					}
					else {
						setTimeout((function(enclosedIndex) {
							return function() {
								//console.log('notifying ' + enclosedIndex + ' of ' + observers.length + ' observers for ' + eventName);
								observers[enclosedIndex].apply(observers[enclosedIndex], [arg]);
							}
						})(i), 1);
					}
				}
			}
		}
	}
	
	// a binding function, mootools style
	if (!Function.prototype._cfBind) {
		Function.prototype._cfBind = function(obj) {
			var f = this;
			return function() {
				return f.apply(obj, arguments);
			}
		}
	}
	var stopEvent = function(event) {
		if (event.stopPropagation) {
			event.stopPropagation();
		}
		else {
			event.cancelBubble = true;
		}
		if (event.preventDefault) {
			event.preventDefault();
		}
		else {
			event.returnValue = false;
		}
		return event;
	};

	var ToField = function(jqFormInput, options) {

		this.options = options;
		this.contacts = options.contacts;
		
		this._windowKeyDownHandler = null;
		this._mouseOverSearchResultsList = false;
		this._searchResultsShown = false;
		
		this.jqFormInput = jqFormInput;
		var w = jqFormInput.width();
		var h = jqFormInput.height();
		this.jqContainer = $('<div class="to-field"></div>').width(w).height(h);
		jqFormInput.hide().before(this.jqContainer);
		this.jqContainer.mousedown(this.handleMouseDown._cfBind(this));
		this.jqContainer.mouseup(this.handleMouseUp._cfBind(this));

		this.addObserver('searchTextChanged', this.handleSearchTextChanged._cfBind(this));
		this.addObserver('searchCompleted', this.handleSearchCompleted._cfBind(this));
	};
	ToField.prototype = $.extend(ToField.prototype, Observable, {
		contacts: [],
		jqContainer: null,
		jqFormInput: null,
		jqInlineInput: null,
		jqInlineInputContainer: null,
		widget: null,

		highlightedResult: null,
		resultsList: null,
		mirrorInputResultItem: null,
		mirrorContact: null,
		searchResults: [],
		searchText: '',
		
		options: {},

		selectedTokens: [],
				
		handleMouseDown: function(event) {
			if (event.target == this.jqContainer.get(0)) {
				this.insertInlineInput();
				stopEvent(event);
			}
		},
		handleMouseUp: function(event) {
		},

		createSearchResult: function(contact) {
			return $('<li>' + contact.name + '</li>');
		},
		
		insertInlineInput: function() {
			var i = this.getInlineInputContainer();
			this.jqContainer.append(i);
			//this.jqContainer.scrollTo(0, this.jqContainer.getScrollSize().y);
			setTimeout((function() {
				this.jqInlineInput.focus();
			})._cfBind(this), 10);
		},
		
		getInlineInputContainer: function() {
			if (this.jqInlineInputContainer) {
				return this.jqInlineInputContainer;
			}
			this.jqInlineInputContainer = $('<div id="inline-input-container"></div>');
			this.jqInlineInput = $('<input type="text" class="inline-input" />');
			this.jqInlineInput.keydown((function(event) {
//				console.dir(event);
				switch (event.keyCode) {
					case 38: 	// up
						this.highlightPrevResult();
						return false;
					break;
					case 40:	// down
						this.highlightNextResult();
						return false;
					break;
					case 13:	// enter
						this.selectHighlightedResult();
						return false;
					break;
					case 27:	// esc
						this.hideSearchResults();
						return false;
					break;
					case 188: 	// comma
						this.selectHighlightedResult();
						return false;
					break;
				}
			})._cfBind(this));
			
			this.jqInlineInput.keyup((function(event) {
				var value = this.jqInlineInput.val();
				if (this.searchText != value) {
					this.setSearchText(value);
				}
			})._cfBind(this));
			/*
			this.addEvent('searchTextChanged', (function(text) {
				this.set('value', text);
			}).bind(this.jqInlineInput));
			*/
			this.jqInlineInput.blur((function() {
				setTimeout((function() {
					if (!this._mouseOverSearchResultsList) {	// yay ie.
						if (this.jqInlineInput.val().length) {
							this.selectHighlightedResult();
						}
						this.hideSearchResults();
					}
				})._cfBind(this), 1);
			})._cfBind(this));
			this.jqInlineInput.focus((function() {
				//this._deselectTokens();
				if (this.searchText.length) {
					this.showSearchResults();
				}
			})._cfBind(this));
			this.jqInlineInputContainer.append(this.jqInlineInput);
			return this.jqInlineInput;
		},
		
		getSearchResultsList: function() {
			if (this.resultsList) {
				return this.resultsList;
			}
			this.resultsList = $('<ul class="search-results"></ul>');
			this.jqContainer.after(this.resultsList);

			// this hackery is for ie, which removes focus from the 
			// input box when you click on a scroll bar.
			/*
			this.resultsList.addEvent('mouseenter', (function(event) {
				this._mouseOverSearchResultsList = true;
			}).bind(this));
			this.resultsList.addEvent('mouseleave', (function(event) {
				this._mouseOverSearchResultsList = false;
				if (Browser.Engine.trident) {
					setTimeout((function() {
						this.inputElement.focus();
					}).bind(this), 10);
				}
			}).bind(this));
			*/
			// note: there doesn't appear to be a way to detect a click on the scroll bar itself.
			// soo... we're kind of screwed here. using the scroll bar without generating a mouseleave event
			// will keep the input blurred, so keyboard commands won't work. ie is teh awesomeness.
			return this.resultsList;
		},
		
		highlightPrevResult: function() {
			console.log('highlightPrevResult');
		},
		highlightNextResult: function() {
			console.log('highlightNextResult');
		},
		selectHighlightedResult: function() {
			console.log('selectHighlightedResult');
		},
		selectHighlightedResult: function() {
			console.log('selectHighlightedResult');
		},
		showSearchResults: function() {
			var list = this.getSearchResultsList();
			list.fadeIn('fast');
			this._searchResultsShown = true;
		},
		hideSearchResults: function() {
			this.highlightedResult = null;
			this.getSearchResultsList().fadeOut('fast');
			this._searchResultsShown = false;
		},
		
		handleSearchTextChanged: function(text) {
			//console.log('handleSearchTextChanged');
			if (text.length) {
				this.dispatchSearch(text);
			}
			else {
				this.hideSearchResults();
			}
		},
		
		setSearchText: function(text) {
			this.searchText = text;
			this.notifyObservers('searchTextChanged', text);
		},
		
		dispatchSearch: function(text) {
			this.notifyObservers('searchCompleted', this.search(text));
		},
		
		search: function(text) {
			var results = [];
			//console.log(this.contacts.length + ' contacts');
			for (var i = 0; i < this.contacts.length; i++) {
				//console.log(this.contacts[i]);
				if (this.contacts[i].name.toLowerCase().indexOf(text.toLowerCase()) != -1) {
					results.push(this.contacts[i]);
				}
			}
			return results;
		},
		handleSearchCompleted: function(results) {
			//console.log('handleSearchCompleted');
			var list = this.getSearchResultsList();
			list.empty();
			for (var i = 0; i < results.length; i++) {
				console.log('adding ' + results[i].name);
				list.append(this.createSearchResult(results[i]));
				/*
				if (list.height() > availableHeight) {
					list.setStyle('height', availableHeight + 'px');
				}
				else {
					list.setStyle('height', 'auto');
				}
				*/
			}
			this.showSearchResults();
		},

	});

	var Contact = function() {
	};
	Contact.prototype = $.extend(Contact.prototype, {
		name: '',
		identifier: '',
		'class': ''
	});
	
	$.fn.toField.search = function(text) {
		
	};
	
	$.fn.toField.sort = function() {
	};



})(jQuery);