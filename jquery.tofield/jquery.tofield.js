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
		var opts = $.extend(true, {}, $.fn.toField.defaults, options);
		// iterate over matched elements
		return this.each(function() {
			// build element specific options
			var o = $.meta ? $.extend({}, opts, $(this).data()) : opts;
			var toField = construct(ToField, [$(this), o]);
		});
	};

	// Globally overridable static methods. Set before first toField initialization.
	// During execution, `this` will refer to the appropriate ToField object.
	$.fn.toField.search = function(text) {
		var results = [];
		//console.log(this.contacts.length + ' contacts');
		for (var i = 0; i < this.contacts.length; i++) {
			if (this.contacts[i].name.toLowerCase().indexOf(text.toLowerCase()) != -1) {
				results.push(this.contacts[i]);
			}
			else if (this.contacts[i].identifier.toLowerCase().indexOf(text.toLowerCase()) != -1) {
				results.push(this.contacts[i]);
			}
		}
		return results;
	};


	/**
	 * By default, we create a sorted array of our current contacts for every current key in 
	 * searchKeys.
	 */
	$.fn.toField.sort = function() {
		this.sortKeyedContacts();
	};

	$.fn.toField.getResultItemMarkup = function(contact) {
		return '\
			<li class="search-result">\
				<div class="contact-name">' + contact.name + '</div>\
				<div class="contact-identifier">&lt;' + contact.identifier + '&gt;</div>\
			</li>';
	};
	
	$.fn.toField.getContactTokenMarkup = function(contact) {
		return '\
			<a href="javascript:void(0)" title="' + contact.identifier + '" class="contact-token' + (contact['class'].length ? ' ' + contact['class'] : '') + '">\
				' + (contact.name.length ? contact.name : contact.identifier) + '\
			</a>';
	};	

	$.fn.toField.defaults = {
		contacts: [],
		ajax: {
			endpoint: null,
			queryKeys: {
				text: 'text',
				maxSuggestions: 'maxSuggestions'
			},
			queryExtra: {
			},
			dataType: 'json'
		},
		maxTokenRows: 4,
		maxSuggestions: 10,
		acceptAdHoc: true,
		search: $.fn.toField.search,
		sort: $.fn.toField.sort,
		idleDelay: 200,
		searchKeys: [],
		coreSearchKeys: [
			'name',
			'identifier'
		],
		getResultItemMarkup: $.fn.toField.getResultItemMarkup,
		getContactTokenMarkup: $.fn.toField.getContactTokenMarkup
	};	

	// simple observer pattern
	var Observable = {
		observers: {},
		addObserver: function(eventName, f) {
			//console.log('adding observer for ' + eventName + ', ' +  this.jqFormInput.attr('name'));
			if (!this.observers[eventName]) {
				this.observers[eventName] = [];
			}
			this.observers[eventName].push(f);
			//console.dir(this.observers);
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
		/**
		 * Only a single argument to the notification callback is supported. Wrap multiple 
		 * arguments in an object. The notifying object isn't passed to callbacks automatically.
		 * 
		 * @param {String} eventName The name of the event to broadcast.
		 * @param {*} arg An argument to pass to notification callbacks.
		 * @param {Boolean} synch Whether to broadcast synchronously (before this method returns). Defaults to false.
		 */
		notifyObservers: function(eventName, arg, synch) {
			if (eventName in this.observers) {
				var observers = this.observers[eventName];
				for (var i = 0; i < observers.length; i++) {
					if (synch) {
						observers[i].apply(observers[i], [arg]);
					}
					else {
						setTimeout((function(enclosedIndex) {
							return (function() {
								//console.log('notifying ' + enclosedIndex + ' of ' + observers.length + ' observers for ' + eventName);
								observers[enclosedIndex].apply(observers[enclosedIndex], [arg]);
							});
						})(i), 1);
					}
				}
			}
		}
	};
	
	// a binding function, mootools style
	if (!Function.prototype._cfBind) {
		Function.prototype._cfBind = function(obj) {
			var f = this;
			return (function() {
				return f.apply(obj, arguments);
			});
		};
	}
	
	// stop an event (a la mootools)
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
/*
	var clone = function(o, fBindTarget) {
		var r = null;
		if (typeof o == 'function') {
			r = o;
			if (fBindTarget) {
				r = o._cfBind(fBindTarget);
			}
		}
		else if (typeof o == 'object' && !o.nodeType) {
			if ('length' in o) {
				r = [];
				var n = o.length;
				for (var i = 0; i < n; i++) {
					r.push(arguments.callee(o[n]));
				}
			}
			else {
				r = {};
				for (var p in o) {
					r[p] = arguments.callee(o[p]);
				}
			}
		}
		else {
			r = o;
		}
		return r;
	};
*/
/*
	var dimensions = function(jqElement) {
		var dim = {
			padding: {
				top: jqElement.css('padding-top'),
				bottom: jqElement.css('padding-bottom'),
				left: jqElement.css('padding-left'),
				right: jqElement.css('padding-right')
			},
			margin: {
				top: jqElement.css('margin-top'),
				bottom: jqElement.css('margin-bottom'),
			}
		}

	};
*/
	// 
	/**
	 * Following D. Crockford's "object" function. Sorta.
	 */
	var construct = function(constructor, args) {
		function F() {};
		$.extend(true, F.prototype, constructor.prototype);
		return constructor.apply(new F(), args);
	};

	var ToField = function(jqFormInput, options) {

		this.options = options;
		this.jqFormInput = jqFormInput;

		this.sortedContacts = {};
		for (var i = 0; i < this.options.searchKeys.length; i++) {
			this.sortedContacts[this.options.searchKeys[i]] = [];
		}
		for (var i = 0; i < this.options.coreSearchKeys.length; i++) {
			this.sortedContacts[this.options.coreSearchKeys[i]] = [];
		}
		//console.dir(this.sortedContacts);
		//this.observers['input_' + this.jqFormInput.attr('name')] = this.jqFormInput.attr('name') + ' wuz here';

		// overridable methods will be defaults (global, defined below) or user-supplied. 
		// peel off a copy of each, bound to this instance.
		this.search = options.search._cfBind(this);
		this.sort = options.sort._cfBind(this);
		this.getResultItemMarkup = options.getResultItemMarkup._cfBind(this);
		this.getContactTokenMarkup = options.getContactTokenMarkup._cfBind(this);
		
		this.setContacts(options.contacts);
		
		//console.dir(this.contacts);
		
		this._windowKeyDownHandler = null;
		this._mouseOverSearchResultsList = false;
		//this._windowMouseDownHandler = null;
		this._searchResultsShown = false;

		var w = jqFormInput.width();
		var h = jqFormInput.height();
		this.jqContainer = $('<div class="to-field"></div>').width(w).height(h);
		jqFormInput.hide().before(this.jqContainer);
		this.jqContainer.mousedown(this.handleMouseDown._cfBind(this));
		this.jqContainer.mouseup(this.handleMouseUp._cfBind(this));

		this.addObserver('searchTextChanged', this.handleSearchTextChanged._cfBind(this));
		this.addObserver('searchCompleted', this.handleSearchCompleted._cfBind(this));
		this.addObserver('contactsCollectionChanged', this.handleContactCollectionChanged._cfBind(this));

		return this;
	};

	$.extend(true, ToField.prototype, Observable, {
		contacts: [],
		jqContainer: null,
		jqFormInput: null,
		jqInlineInput: null,
		jqInlineInputContainer: null,
		widget: null,

		jqHighlightedResult: null,
		jqResultsList: null,
		mirrorContact: null,
		searchResults: [],
		searchText: '',
		keydownTimer: -1,

		options: {},

		selectedTokens: [],
		
		getFormName: function() {
			return this.jqFormInput.attr('name');
		},
		
		handleMouseDown: function(event) {
			//console.log('mouse down in ' + this.jqFormInput.attr('name'));
			if (event.target == this.jqContainer.get(0) || event.target == this.jqInlineInputContainer.get(0)) {
				this.insertInlineInput();
				//stopEvent(event);
			}
		},
		handleMouseUp: function(event) {
		},

		createResultListItem: function(contact) {
			var jqResult = $(this.getResultItemMarkup(contact));
			var toField = this;
			jqResult.contact = contact;
			jqResult.eventHandlers = {
				mouseenter: function(event) {
					toField.highlightResult(jqResult);
				},
				mouseleave: function(event) {
					setTimeout(function() {
						if (toField.getHighlightedResult() == jqResult) {
							jqResult.removeClass('highlighted');
							toField.highlightedResult = null;
						}
					}, 100);
				},
				click: function(event) {
					//console.log(jqResult.contact.name + ' clicked');
					jqResult.contact.select();
				}
			};
			for (var name in jqResult.eventHandlers) {
				jqResult[name](jqResult.eventHandlers[name]);
			}
			return jqResult;
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
			this.jqInlineInputContainer = $('<div class="inline-input-container"></div>');
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
			/*
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
			* */
			this.jqInlineInputContainer.append(this.jqInlineInput);
			return this.jqInlineInputContainer;
		},
		
		getSearchResultsList: function() {
			if (this.jqResultsList) {
				return this.jqResultsList;
			}
			this.jqResultsList = $('<ul class="search-results"></ul>');
			//this.jqContainer.after(this.jqResultsList);
			$('body').append(this.jqResultsList);

			// this hackery is for ie, which removes focus from the 
			// input box when you click on a scroll bar.
			/*
			this.jqResultsList.addEvent('mouseenter', (function(event) {
				this._mouseOverSearchjqResultsList = true;
			}).bind(this));
			this.jqResultsList.addEvent('mouseleave', (function(event) {
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
			return this.jqResultsList;
		},
		
		createMirrorContact: function() {
			var c = construct(MirrorContact, [{ name: '', identifier: '' }, this]);
			c.jqResultItem = this.createResultListItem(c);
			c.jqResultItem.addClass('mirror');
			var toField = this;
			c.addObserver(
				'selectionStateChanged',
				toField.handleContactSelectionStateChanged._cfBind(toField)
			);
			return c;
		},
		
		getMirrorContact: function() {
			if (this.mirrorContact) {
				return this.mirrorContact;
			}
			this.mirrorContact = this.createMirrorContact();
			return this.mirrorContact;
		},
		
		selectHighlightedResult: function() {
			if (this.jqHighlightedResult) {
				var i = this.getHighlightedResultIndex();
				console.log(this.searchResults[i]);
				this.searchResults[i].select();
			}
			/*
			if (this.jqHighlightedResult && this.jqHighlightedResult.contact) {
				if (this.jqHighlightedResult.contact.identifier.length) {
					this.jqHighlightedResult.contact.select();
					//this.hideSearchResults();
				}
			}
			* */
			//this.setSearchText('');
			setTimeout((function() {
				this.insertInlineInput();
			})._cfBind(this), 10);
		},
		
		/**
		 * First argument can be a jQuery-ed list item or an index into the list.
		 */
		highlightResult: function(jqItem, scrollBehavior) {
			var jqList = this.getSearchResultsList();
			//console.log('highlight ' + jqItem);
			if (typeof jqItem == 'number') {
				//contact = this.searchResults[jqItem];// || this.getMirrorContact();
				jqItem = $(jqList.children('li')[jqItem]);
			}
			
			$('li', jqList).removeClass('highlighted');
			
			this.jqHighlightedResult = jqItem;
			//console.log(jqItem);
			
			if (this.jqHighlightedResult) {
				this.jqHighlightedResult.addClass('highlighted');
				if (scrollBehavior == undefined || scrollBehavior == 'scroll') {
					var itemPos = this.jqHighlightedResult.position().left;
					var itemHeight = this.jqHighlightedResult.height();
					var scrollPos = jqList.scrollTop();
					var listHeight = jqList.height();
					itemPos += (!$.support.boxModel ? scrollPos : 0);
					if (itemPos < scrollPos) {
						jqList.scrollTop(itemPos);
					}
					if (itemPos + itemHeight > scrollPos + listHeight) {
						jqList.scrollTop(scrollPos + ((itemPos + itemHeight) - (scrollPos + listHeight)));
					}
				}
			}
		},
		
		getHighlightedResult: function() {
			return this.jqHighlightedResult;
		},
		
		getHighlightedResultIndex: function() {
			var i = -1;
			this.jqResultsList.children('li').each(function(index) {
				if ($(this).hasClass('highlighted')) {
					i = index;
					return false;
				}
			});
			/*
			if (this.jqHighlightedResult && this.jqHighlightedResult.contact) {
				for (var i = 0; i < this.searchResults.length; i++) {
					if (this.searchResults[i] == this.jqHighlightedResult.contact) {
						return i;
					}
				}
			}
			*/
			return i;
		},
		
		showSearchResults: function() {
			var jqList = this.getSearchResultsList();
			jqList.fadeIn('fast');
			jqList.width(this.jqContainer.width());
			var inputPosition = this.jqContainer.offset();
			jqList.css({
				top: (inputPosition.top + this.jqContainer.height()) + 'px',
				left: (inputPosition.left) + 'px'
			});
			this._searchResultsShown = true;
		},
		hideSearchResults: function() {
			this.jqHighlightedResult = null;
			this.getSearchResultsList().fadeOut('fast');
			this._searchResultsShown = false;
		},
		
		handleSearchTextChanged: function(text) {
			//console.log('handleSearchTextChanged');
			if (text.length) {
				this.dispatchSearch(text);
			}
			else {
				if (this.options.ajax.endpoint) {
					this.pruneContacts();
				}
				this.hideSearchResults();
			}
		},
		
		highlightPrevResult: function() {
			var current = this.getHighlightedResultIndex();
			if (current == -1) {
				this.highlightResult(this.searchResults.length - 1);
			}
			else if (current > 0) {
				this.highlightResult(current - 1);
			}
		},

		highlightNextResult: function() {
			var current = this.getHighlightedResultIndex();
			if (current == -1) {
				//this.highlightResult(this.searchResults.length - 1);
				this.highlightResult(0);
			}
			else {
				if (current >= 0 && current < this.searchResults.length - 1) {
					this.highlightResult(current + 1);
				}
			}
		},

		setSearchText: function(text) {
			if (this.jqInlineInput.val() != text) {
				this.jqInlineInput.val(text);
			}
			this.searchText = text;
			this.notifyObservers('searchTextChanged', text);
		},
		
		sortKeyedContacts: function() {
			for (var key in this.sortedContacts) {
				this.sortedContacts[key] = this.contacts.slice(0);
				Contact.prototype.keySorting_toString = function() {
					return this[key];
				};
				this.sortedContacts[key].sort();
			}
			Contact.prototype.keySorting_toString = null;
		},
		
		sendAjaxRequest: function(text) {
			var query = {};
			for (var k in this.options.ajax.queryKeys) {
				query[this.options.ajax.queryKeys[k]] = this.options[k];
			}
			query[this.options.ajax.queryKeys.text] = text;
			var query = $.extend(this.options.ajax.queryExtra, query);
			$.get(
				this.options.ajax.endpoint,
				query,
				this.handleAjaxSuccess._cfBind(this),
				this.options.ajax.dataType
			);
		},
		
		dispatchSearch: function(text) {

			var f = (function() {
				if (this.options.ajax.endpoint) {
					this.sendAjaxRequest(text);
				}
				else {
					var results = this.search(text);
					this.notifyObservers('searchCompleted', results);
				}
				this.keydownTimer = -1;
			})._cfBind(this);

			if (this.keydownTimer > 0) {
				clearTimeout(this.keydownTimer);
			}
			this.keydownTimer = setTimeout(f, this.options.idleDelay);
/*
			
			if (this.options.ajax.endpoint) {
				var f = (function() {
					this.sendAjaxRequest(text);
					this.keydownTimer = -1;
				})._cfBind(this);
				
				if (this.keydownTimer > 0) {
					clearTimeout(this.keydownTimer);
				}
				this.keydownTimer = setTimeout(f, idleDelay);
			}
			else {
				var results = this.search(text);
				this.notifyObservers('searchCompleted', results);
			}
*/
		},
		
		/**
		 * Does not remove contacts that are selected.
		 */
		pruneContacts: function() {
			var n = this.contacts.length;
			//console.dir(this.contacts);
			this.contacts = $.grep(this.contacts, function(contact) { return contact.isSelected(); });
			//console.log('pruned ' + (n - this.contacts.length) + ' contacts, now have ' + this.contacts.length + ' contacts' );
		},

		setContacts: function(contacts) {
			this.pruneContacts();
			var toField = this;
			//console.log('setting contacts for ' + this.jqFormInput.attr('name'));
			$.each(contacts, function(i, contact) {
				if (!contact.identifier) {
					throw 'Contact ' + (contact.name ? contact.name : '') + ' does not have an identifier.';
				}
				if (!contact._isADuck) {
					contactObj = construct(Contact, [contact, this]);
					contactObj.addObserver(
						'selectionStateChanged', 
						toField.handleContactSelectionStateChanged._cfBind(toField)
					);
				}
				else {
					// reuse it
					//console.log('contact ' + contact.name + ' is a duck');
					contactObj = contact;
				}
				if (!contactObj.isSelected()) {
					toField.contacts.push(contactObj);
				}
				//console.log(toField.getFormName() + ' is observing ' + contactObj.name + ' for selectionStateChanged');
			});
			this.notifyObservers('contactsCollectionChanged', this.contacts);
			this.sort();
		},
		
		searchBy: function(key, text) {
			//console.log('search by ' + key + ' for ' + text + ', sorted contacts: ');
			//console.dir(this.sortedContacts[key]);
			if (this.sortedContacts[key]) {
				return this.binarySearch(text, key, this.sortedContacts[key]);
			}
			return null;
		},
		
		binarySearch: function(match, key, array) {
			var searchState = { left: -1, right: -1, middle: -1, result: null };
			var searchTimer = null;
			var found = false;
			var sleep = 30;
			var iterations = 20;	// should be plenty
			
			searchState = this._statefulBSearch(match, key, array, searchState, iterations);
			if ((searchState.left >= 0 && (searchState.left == searchState.middle || searchState.right == searchState.middle)) || searchState.result) {
				// finished searching
				if (searchState.result) {
					found = searchState.result;
				}
			}
			else {
				// ran out of iterations, not found
				//searchTimer = setTimeout(arguments.callee, sleep);
			}
			return found;
			/*
			searchTimer = setTimeout((function() {
				searchState = this._statefulBSearch(match, key, array, searchState, iterations);
				if ((searchState.left >= 0 && (searchState.left == searchState.middle || searchState.right == searchState.middle)) || searchState.result) {
					// finished searching
					if (searchState.result) {
						found = searchState.result;
					}
				}
				else {
					// ran out of iterations, not found
					searchTimer = setTimeout(arguments.callee, sleep);
				}
			})._cfBind(this), sleep);
			*/
		},
		
		_statefulBSearch: function(match, key, sortedArray, state, iterations) {
			match = match.toLowerCase();
			var nObjects = sortedArray.length;
			state.left = (state.left >= 0 ? state.left : 0);
			state.right = (state.right >= 0 ? state.right : sortedArray.length - 1);
			state.middle = (state.middle >= 0 ? state.middle : Math.floor(state.right / 2));
			var i = 0;
			while (state.left < state.right && i < iterations) {
				if (sortedArray[state.middle][key].toLowerCase() == match) {
					state.result = sortedArray[state.middle];
					return state;
				}
				else if (match < sortedArray[state.middle][key].toLowerCase()) {
					state.right = state.middle;
				}
				else if (match > sortedArray[state.middle][key].toLowerCase()) {
					state.left = state.middle;
				}
				if ((state.right - state.left == 1) && (sortedArray[state.right][key].toLowerCase() == match)) {
					state.result = sortedArray[state.right];
					return state;
				}
				state.middle = Math.floor((state.right + state.left) / 2);
				i++;
			}
			return state;
		},
		
		mergeContacts: function(contacts) {
			var existing = null;
			//console.log('merge ' + contacts.length + ' incoming contacts into current list with ' + this.contacts.length + ' ... ');
			var newContacts = this.contacts.slice(0); // new copy
			for (var i = 0; i < contacts.length; i++) {
				existing = this.searchBy('identifier', contacts[i].identifier);
				if (!existing) {
					newContacts.push(contacts[i]);
				}
				else {
					//console.log(existing.name + ' already cached');
				}
			}
			this.setContacts(newContacts);
			//console.log('done, current lenght: ' + this.contacts.length);
		},
		
		handleAjaxSuccess: function(data, status) {
			this.mergeContacts(data);
			var ids = $.map(data, function(item, i) { return item.identifier; });
			var contacts = $.grep(this.contacts, function(item, i) { return ($.inArray(item.identifier, ids) != -1); });
			this.notifyObservers('searchCompleted', contacts);
		},
		
		handleSearchCompleted: function(results) {
			//console.log('handleSearchCompleted');
			var jqList = this.getSearchResultsList();
			var oldHighlightedIndex = this.getHighlightedResultIndex();
			var oldHighlightedContact = this.searchResults[oldHighlightedIndex];
			//console.log(this.getHighlightedResultIndex() + ': ' + oldHighlightedContact);
			jqList.empty();
			this.searchResults = [];
			if (this.options.acceptAdHoc) {
				this.searchResults.push(this.getMirrorContact());
				jqList.append(this.getMirrorContact().jqResultItem);
			}
			// skip the mirror
			for (var i = 0; i < results.length; i++) {
				if (!results[i].isSelected()) {
					this.searchResults.push(results[i]);
					jqList.append(this.createResultListItem(results[i]));
				}
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
			
			if ((results.length == 0 && this.options.acceptAdHoc) || !oldHighlightedContact) {
				this.highlightResult(0);	// mirror
			}
			else if (results.length == 1) {
				// if only one result, highlight it.
				if (this.options.acceptAdHoc) {
					this.highlightResult(1);
				}
				else {
					this.highlightResult(0);
				}
			}
			else if (oldHighlightedContact) {
				var found = false;
				for (var i = 0; i < this.searchResults.length; i++) {
//					if (!this.searchResults[i].isEqualToContact) {
//						console.dir(this.searchResults[i]);
//					}
					if (this.searchResults[i].isEqualToContact(oldHighlightedContact)) {
						this.highlightResult(i);
						found = true;
						break;
					}
				}
				if (!found) {
					if (oldHighlightedIndex > this.searchResults.length - 1) {
						oldHighlightedIndex = Math.max(0, this.searchResults.length - 1);
					}
					this.highlightResult(oldHighlightedIndex);
				}
			}
		},
		
		handleContactSelectionStateChanged: function(change) {
			if (change.state == true) {
				if (change.contact == this.mirrorContact) {
					// next call to get will create a new one.
					this.contacts.push(this.mirrorContact);
					this.mirrorContact = null;
				}
				var token = construct(Token, [change.contact, this]);
				token.addObserver('tokenRemoved', this.layoutContainer._cfBind(this));
				token.addObserver('tokenAdded', this.layoutContainer._cfBind(this));
				token.addBefore(this.jqInlineInputContainer);
				this.setSearchText('');
				this.hideSearchResults();
				this.jqInlineInput.focus();
			}
			var selected = [];
			for (var i = 0; i < this.contacts.length; i++) {
				if (this.contacts[i].selected) {
					selected.push(this.contacts[i].identifier);
				}
			}
			this.jqFormInput.val(selected.join(','));
		},

		layoutContainer: function() {
			var scrollbarSize = 20;
			var containerHeight = this.jqContainer.innerHeight();
			var contentHeight = rowsOver = tokenRowHeight = rows = 0;
			var inputRowHeight = this.jqInlineInputContainer.outerHeight(true);
			var contentHeight = inputRowHeight;
			var lastY = -1;
			this.jqContainer.children().each(function() {
				var jqThis = $(this);
				if (jqThis.position().top != lastY) {
					rows++;
					if (jqThis.hasClass('inline-input-container')) {
						contentHeight += inputRowHeight;
					}
					else {
						contentHeight += tokenRowHeight;
						tokenRowHeight = $(this).outerHeight(true);
					}
					lastY = $(this).position().top;
				}
			});
			if (rows > (this.options.maxTokenRows + 1)) {
				this.jqContainer.height((this.options.maxTokenRows * tokenRowHeight) +  inputRowHeight);
				this.jqContainer.css('overflow', 'auto');
				var inputLeft = this.jqInlineInput.position().left;
				var diff = this.jqContainer.innerWidth() - (inputLeft + this.jqInlineInput.outerWidth());
				if (diff < scrollbarSize) {
					this.jqInlineInput.width(this.jqInlineInput.width() - scrollbarSize);
				}
			}
			else {
				this.jqContainer.height((tokenRowHeight * (rows - 1)) + inputRowHeight);
				//this.jqContainer.css('overflow', 'hidden');
			}
		},

		handleContactCollectionChanged: function(collection) {
			
		}
	});
	
	var Contact = function(data, toField) {
		this.toField = toField;
		$.extend(this, data);
		//console.log('creating contact ' + data.name);
		//console.log('constructing contact ' + this.name + ', observers: ');
		//console.dir(this.observers);
		//this.observers['contact_' + this.name] = this.name + ' wuz here';
		return this;
	};
//	console.log('clone of Observable is:');
//	console.dir(clone(Observable));
	$.extend(true, Contact.prototype, Observable, {
		toField: null,
		name: '',
		identifier: '',
		'class': '',
		selected: false,
		
		_isADuck: true,
		
		keySorting_toString: null,
		
		
		setName: function(name) {
			this.name = name;
			this.notifyObservers('nameChanged', name);
		},
		setIdentifier: function(identifier) {
			this.identifier = identifier;
			this.notifyObservers('identifierChanged', identifier);
		},
		select: function() {
			this.selected = true;
			//console.log(this.name + '\'s observers: ');
			//console.dir(this.observers);
			//console.log(this.name + ' select() called');
			this.notifyObservers('selectionStateChanged', { contact: this, state: true });
		},
		deselect: function() {
			this.selected = false;
			this.notifyObservers('selectionStateChanged', { contact: this, state: false });
		},
		isSelected: function() {
			return this.selected;
		},
		isEqualToContact: function(contact) {
			return (this.identifier == contact.identifier/* && this['class'] == contact['class']*/);
		},
		toString: function() {
			if (this.keySorting_toString) {
				return this.keySorting_toString.apply(this);
			}
			return this.name;
		}
	});
	//this.observers[this.name + '_test'] = this.name + ' wuz here';

	var MirrorContact = function(data, toField) {
		this.superclass.prototype.constructor.apply(this, arguments);
		this.handleSearchTextChanged = this.handleSearchTextChanged._cfBind(this);	// heh. grumble grumble
		toField.addObserver('searchTextChanged', this.handleSearchTextChanged);
		return this;
	}
	$.extend(true, MirrorContact.prototype, Contact.prototype, {
		superclass: Contact,	// kinda-sorta inheritance ... meh.
		select: function() {
			this.toField.removeObserver('searchTextChanged', this.handleSearchTextChanged);
			this.superclass.prototype.select.apply(this);
		},
		handleSearchTextChanged: function(text) {
			this.setIdentifier(text);
			this.setName(text);
			if (this.jqResultItem) {
				this.jqResultItem.html(this.toField.getResultItemMarkup(this));
			}
		}
	});

	var Token = function(contact, toField) {
		this.contact = contact;
		this.toField = toField;
		this.jqContainer = toField.jqContainer;
		contact.addObserver('selectionStateChanged', this.handleContactSelectionStateChanged._cfBind(this));
		this.jqToken = jqToken = $(toField.getContactTokenMarkup(contact));
		this.jqToken.hover(
			function(event) {
				jqToken.addClass('token-hover');
			},
			function(event) {
				jqToken.removeClass('token-hover');
				jqToken.removeClass('x-hover');
			}
		);
		this.jqToken.mousemove(this.handleMouseMove._cfBind(this));
		this.jqToken.click(this.handleClick._cfBind(this));
		return this;
	};
	$.extend(true, Token.prototype, Observable, {
		jqToken: null,
		toField: null,
		jqContainer: null,
		
		handleContactSelectionStateChanged: function(change) {
			if (change.state == false) {
				this.remove();
			}
		},
		addBefore: function(jqElement) {
			jqElement.before(this.jqToken);
			this.notifyObservers('tokenAdded', { token: this, container: jqElement.parent() });
		},
		remove: function() {
			this.jqToken.remove();
			this.notifyObservers('tokenRemoved', { token: this, container: this.jqToken.parent() });
		},
		
		pointIsOverX: function(pageX, pageY) {
			var paddingLeft = parseInt(this.jqToken.css('padding-left'));
			var paddingRight = parseInt(this.jqToken.css('padding-right'));
			var w = this.jqToken.width() + (isNaN(paddingRight) ? 0 : paddingRight) + (isNaN(paddingLeft) ? 0 : paddingLeft);
			var xLeft = w - 20;
			var elementXPos = this.jqToken.offset().left;
			return (pageX - elementXPos > xLeft);
		},
		
		handleMouseMove: function(event) {
			//console.dir(event);
			if (this.pointIsOverX(event.pageX, event.pageY)) {
				this.jqToken.addClass('x-hover');
			}
			else {
				this.jqToken.removeClass('x-hover');
			}
			stopEvent(event);
		},
		
		handleClick: function(event) {
			if (this.pointIsOverX(event.pageX, event.pageY)) {
				this.contact.deselect();
			}
		}
	});

})(jQuery);