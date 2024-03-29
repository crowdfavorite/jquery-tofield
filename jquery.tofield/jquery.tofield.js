/*
 * to:field 1.0
 *
 * http://crowdfavorite.com/
 * @todo: add link to jquery plugin page
 *
 * Copyright (c) 2009 Crowd Favorite
 * Last Updated: 2009.04.24
 * 
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 * 
 * The to:field jQuery plugin transforms any text form input, with only a few 
 * lines of code, into a Facebook-style auto-suggest widget. 
 * 
 * Requires jQuery 1.3.
 * 
 */

;(function($) {

	$.fn.toField = function(options) {

		// special handling for searchKeys:
		// if the user specifies any of our defaults (name or identifier), we want to use 
		// that info. otherwise, make sure those two are in front.
		var normalizedSearchKeys = [];
		
		if (options.searchKeys) {
			$.each($.fn.toField.defaults.searchKeys, function(i, defaultKey) {
				var inUserSearchKeys = false;
				defaultKey = normalizeSearchKeyItem(defaultKey);
				$.each(options.searchKeys, function(i, userKey) {
					userKey = normalizeSearchKeyItem(userKey);
					if (userKey.property == defaultKey.property) {
						inUserSearchKeys = true;
					}
				});
				if (!inUserSearchKeys) {
					normalizedSearchKeys.push(defaultKey);
				}
			});
			normalizedSearchKeys = normalizedSearchKeys.concat($.map(options.searchKeys, function(key) { return normalizeSearchKeyItem(key); }));
		}
		else {
			normalizedSearchKeys = $.map($.fn.toField.defaults.searchKeys, function(key) { return normalizeSearchKeyItem(key); });
		}
		
		options.searchKeys = normalizedSearchKeys;
		var opts = $.extend(true, {}, $.fn.toField.defaults, options);
		
		// iterate over matched elements
		return this.each(function() {
			// build element specific options
			var o = $.meta ? $.extend({}, opts, $(this).data()) : opts;
			var toField = construct(ToField, [$(this), o]);
		});
	};
	
	var normalizeSearchKeyItem = function(item) {
		return (typeof item == 'string') ? { property: item } : item;
	};

	$.fn.toField.search = function(text) {
		var results = [];
		var suggestionsToGo = this.options.maxSuggestions;

		for (var i = 0; i < this.options.searchKeys.length && suggestionsToGo > 0; i++) {
			key = this.options.searchKeys[i].property;
			if (this.options.searchKeys[i].search) {
				// "hit weights" feature not ready
				//var hits = this.options.searchKeys[i].search(key, text, Math.min(suggestionsToGo, this.searchHits[key]));
				var hits = this.options.searchKeys[i].search(this.contacts, key, text, suggestionsToGo);
				//if (hits) console.log('... found ' + hits.length);
			}
			else {
				// "hit weights" feature not ready
				//var hits = this.searchPrefixBy(key, text, Math.min(suggestionsToGo, this.searchHits[key]));
				var hits = this.searchPrefixBy(key, text, suggestionsToGo);
			}
			if (hits) {
				// filter out already-found. seems there should be a better way to do this ...
				hits = $.grep(hits, function(contact) {
					for (var k = 0; k < results.length; k++) {
						if (results[k].isEqualToContact(contact)) {
							return false;
						}
					}
					return true;
				});
				suggestionsToGo -= hits.length;
				results = results.concat(hits);
			}
		}
		return results;
	};

	$.fn.toField.sanitizeText = function(text) {
		return text.substr(0, Math.min(text.length, 255));
	};

	$.fn.toField.htmlEscapeText = function(text) {
		return text.replace(/&/gmi, '&amp;').
			replace(/"/gmi, '&quot;').
			replace(/>/gmi, '&gt;').
			replace(/</gmi, '&lt;');
	};

	$.fn.toField.getResultItemMarkup = function(contact) {
		return '\
			<li class="search-result">\
				' + (!contact.isMirror() ? '<div class="contact-name">' + contact.toField.htmlEscapeText(contact.name) + '</div>' : '') + '\
				<div class="contact-identifier">&lt;' + contact.toField.htmlEscapeText(contact.identifier) + '&gt;</div>\
			</li>';
	};
	
	$.fn.toField.getContactTokenMarkup = function(contact) {
		var customClass = contact.getCustomClass();
		return '\
			<a href="javascript:void(0)" title="' + contact.toField.htmlEscapeText(contact.identifier) + '" class="contact-token' + (customClass.length ? ' ' + customClass : '') + '">\
				' + (contact.name.length ? contact.toField.htmlEscapeText(contact.name).replace(' ', '&nbsp;') : contact.toField.htmlEscapeText(contact.identifier)) + '\
			</a>';
	};

	$.fn.toField.setFormInput = function(contacts, jqInput) {
		var val = $.map(contacts, function(contact) { return contact.identifier; }).join(',');
		jqInput.val(val);
		// trigger on both the toField and the input itself
		$(this).trigger('selectionChanged', val);
		jqInput.trigger('selectionChanged', val);
		/*
		if (typeof this.handleChanged == 'function') {
			this.handleChanged(val);
		}
		*/
	};

	$.fn.toField.getFormInputValue = function(jqInput) {
		return jqInput.val().split(',');
		//jqInput.val($.map(contacts, function(contact) { return contact.identifier; }).join(','));
	};

	
	$.fn.toField.truncateTokenToFit = function(jqToken, maxWidth) {
		var safety = 0;	// avoid accidental inifinite loop
		var text = $.trim(jqToken.html());	// assumes markup structure
		while (jqToken.outerWidth(true) > maxWidth && safety++ < 255) {
			jqToken.html(text.substr(0, text.length - 2) + '&hellip;');
			text = jqToken.html();
		}
	};
	
	$.fn.toField.handleContactSelectionStateChanged = function(change) {
		if (change.state == true) {
			if (change.contact == this.mirrorContact) {
				this.contacts.push(this.mirrorContact);
				this.mirrorContact = null;		// next call to get will create a new one
			}
			var token = construct(Token, [change.contact, this]);
			token.addObserver('tokenRemoved', this.layoutContainer._cfBind(this));
			token.addObserver('tokenAdded', this.layoutContainer._cfBind(this));
			token.addBefore(this.jqInlineInputContainer);
			this.setSearchText('');
			this.hideSearchResults();
			this.jqHighlightedResult = null;
			this.jqInlineInput.focus();
		}
		var selected = $.grep(this.contacts, function(contact) { return contact.isSelected(); });
		this.setFormInput(selected, this.jqFormInput);
	};

	$.fn.toField.defaults = {
		contacts: [],
		maxTokenRows: 4,
		maxSuggestions: 10,
		maxSuggestionRows: 5,
		minTextLength: 0,
		acceptAdHoc: true,
		idleDelay: 100,
		scrollbarSize: 18,
		searchKeys: [ 'name', 'identifier' ],
		search: $.fn.toField.search,
		setFormInput: $.fn.toField.setFormInput,
		getFormInputValue: $.fn.toField.getFormInputValue,
		getResultItemMarkup: $.fn.toField.getResultItemMarkup,
		getContactTokenMarkup: $.fn.toField.getContactTokenMarkup,
		truncateTokenToFit: $.fn.toField.truncateTokenToFit,
		sanitizeText: $.fn.toField.sanitizeText,
		htmlEscapeText: $.fn.toField.htmlEscapeText,
		handleContactSelectionStateChanged: $.fn.toField.handleContactSelectionStateChanged
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
	
	var construct = function(constructor, args) {
		function F() {};
		$.extend(true, F.prototype, constructor.prototype);
		return constructor.apply(new F(), args);
	};

	var ToField = function(jqFormInput, options) {

		this.options = options;
		this.jqFormInput = jqFormInput;

		this.sortedContacts = {};
		
		// set up sortedContacts arrays
		for (var i = 0; i < this.options.searchKeys.length; i++) {
			// don't sort for properties the user wants to search him/herself
			if (!this.options.searchKeys[i].search) {
				this.sortedContacts[this.options.searchKeys[i].property] = [];
			}
		}

		// overridable methods will be defaults (global, defined below) or user-supplied. 
		// peel off a copy of each, bound to this instance.
		this.search = options.search._cfBind(this);
		this.getResultItemMarkup = options.getResultItemMarkup._cfBind(this);
		this.getContactTokenMarkup = options.getContactTokenMarkup._cfBind(this);
		this.setFormInput = options.setFormInput._cfBind(this);
		this.getFormInputValue = options.getFormInputValue._cfBind(this);
		this.sanitizeText = options.sanitizeText._cfBind(this);
		this.htmlEscapeText = options.htmlEscapeText._cfBind(this);
		this.handleContactSelectionStateChanged = options.handleContactSelectionStateChanged._cfBind(this);
		
		var initialValues = this.getFormInputValue(jqFormInput);
		var contacts = (typeof options.contacts == 'function') ? options.contacts() : options.contacts;

		// add in any values we don't already know about if we are 
		// ok with ad-hoc.
		if (this.options.acceptAdHoc) {
			$.each(initialValues, function(i, value) {
				if (!value.length) {
					return;
				}
				var known = false;
				if (contacts.length) {
					$.each(contacts, function(i, contact) {
						if (contact.identifier == value) {
							known = true;
							return false;
						}
					});
				}
				if (!known) {
					contacts.push({ name: value, identifier: value });
				}
			});
		}
		
		this.setContacts(contacts, true);
		
		this.options.maxSuggestionRows = Math.max(2, this.options.maxSuggestionRows);
		this.options.maxTokenRows = Math.max(2, this.options.maxTokenRows);
		
		this._mouseOverSearchResultsList = false;
		this._searchResultsShown = false;

		var w = jqFormInput.innerWidth();
		var h = jqFormInput.innerHeight();
		this.jqContainer = $('<div class="to-field"></div>').width(w).height(h);
		jqFormInput.hide().before(this.jqContainer);
		this.insertInlineInput(false);
		this.jqContainer.mousedown(this.handleMouseDown._cfBind(this));

		this.addObserver('searchTextChanged', this.handleSearchTextChanged._cfBind(this));
		this.addObserver('searchCompleted', this.handleSearchCompleted._cfBind(this));
		this.addObserver('sortingCompleted', this.handleSortingCompleted._cfBind(this));
		this.calculateSearchParams();

		// select existing values
		$.each(initialValues, (function(i, value) {
			if (this.contacts.length) {
				$.each(this.contacts, function(i, contact) {
					if (contact.identifier == value) {
						contact.select();
					}
				});
			}
		})._cfBind(this));
		
		return this;
	};

	$.extend(true, ToField.prototype, Observable, {
		contacts: [],
		searchResults: [],
		selectedTokens: [],
		searchHits: {},
		jqContainer: null,
		jqFormInput: null,
		jqInlineInput: null,
		jqInlineInputContainer: null,
		volatileContacts: false,

		jqHighlightedResult: null,
		jqResultsList: null,
		mirrorContact: null,
		searchText: '',
		keydownTimer: -1,
		currentSortKey: null,
		
		options: {},

		getFormName: function() {
			return this.jqFormInput.attr('name');
		},
		
		getFormInput: function() {
			return this.jqFormInput;
		},
		
		handleMouseDown: function(event) {
			if (event.target == this.jqContainer.get(0) || event.target == this.jqInlineInputContainer.get(0)) {
				if (!this.probablyHasScrollbars() || !this.pointOverScrollbars(event.pageX, event.pageY)) {
					this.insertInlineInput();
				}
			}
		},
		
		probablyHasScrollbars: function() {
			var maybeCanHas = false;
			$.each(['overflow', 'overflow-x', 'overflow-y'], (function(i, key) { 
				if (this.jqContainer.css(key) == 'auto') maybeCanHas = true; 
			})._cfBind(this));
			return maybeCanHas;
		},
		
		pointOverScrollbars: function(pageX, pageY) {
			var offset = this.jqContainer.offset();
			var w = this.jqContainer.outerWidth();
			var h = this.jqContainer.outerHeight();
			
			var r = (pageX > offset.left + w - this.options.scrollbarSize && pageX < offset.left + w) || 
					(pageY > offset.top + h - this.options.scrollbarSize && pageY < offset.top + h);
			return r;
		},

		createResultListItem: function(contact) {
			var jqResult = $(this.getResultItemMarkup(contact));
			if (contact.customClass.length) {
				jqResult.addClass(contact.customClass);
			}
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
					jqResult.contact.select();
				}
			};
			for (var name in jqResult.eventHandlers) {
				jqResult[name](jqResult.eventHandlers[name]);
			}
			return jqResult;
		},
		
		insertInlineInput: function(andFocus) {
			var i = this.getInlineInputContainer();
			i.width(this.jqContainer.innerWidth() - this.options.scrollbarSize);
			this.jqContainer.append(i);
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
				switch (event.keyCode) {
					case 38: 	// up
						this.highlightPrevResult();
					return false;
					case 40:	// down
						this.highlightNextResult();
					return false;
					case 27:	// esc
						this.hideSearchResults();
					return false;
					case 13:	// enter
					case 188: 	// comma
						this.selectHighlightedResult();
					return false;
				}
				return true;
			})._cfBind(this));
			
			this.jqInlineInput.keyup((function(event) {
				var value = this.sanitizeText(this.jqInlineInput.val());
				if (this.searchText != value) {
					this.setSearchText(value);
				}
			})._cfBind(this));
			
			this.jqInlineInput.blur((function(event) {
				setTimeout((function() {
					if (!this._mouseOverSearchResultsList) {	// yay ie.
						this.hideSearchResults();
					}
					$(this).trigger('blur');
				})._cfBind(this), 1);
			})._cfBind(this));
			
			this.jqInlineInput.focus((function() {
				if (this.searchText.length) {
					this.showSearchResults();
				}
				$(this).trigger('focus');
			})._cfBind(this));

			this.jqInlineInputContainer.append(this.jqInlineInput);
			return this.jqInlineInputContainer;
		},
		
		getSearchResultsList: function() {
			if (this.jqResultsList) {
				return this.jqResultsList;
			}
			this.jqResultsList = $('<ul class="search-results"></ul>');
			$('body').append(this.jqResultsList);

			this.jqResultsList.mouseenter((function(event) {
				this._mouseOverSearchResultsList = true;
			})._cfBind(this));
			this.jqResultsList.mouseleave((function(event) {
				this._mouseOverSearchResultsList = false;
			})._cfBind(this));

			return this.jqResultsList;
		},
		
		createMirrorContact: function() {
			var c = construct(MirrorContact, [{ name: '', identifier: '' }, this]);
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
				this.searchResults[i].select();
			}
			setTimeout((function() {
				this.insertInlineInput();
			})._cfBind(this), 10);
		},

		// First argument can be a jQuery-ed list item or an index into the list.
		highlightResult: function(jqItem, scrollBehavior) {
			if (!this._searchResultsShown) {
				return;
			}
			var jqList = this.getSearchResultsList();
			if (typeof jqItem == 'number') {
				jqItem = $(jqList.children('li')[jqItem]);
			}
			
			jqList.children('li').removeClass('highlighted');
			
			this.jqHighlightedResult = jqItem;
			
			if (this.jqHighlightedResult) {
				this.jqHighlightedResult.addClass('highlighted');
				if (scrollBehavior == undefined || scrollBehavior == 'scroll') {
					var itemPos = this.jqHighlightedResult.position().top;
					var itemHeight = this.jqHighlightedResult.outerHeight();
					var scrollPos = jqList.scrollTop();
					var itemRelativePos = itemPos + scrollPos;
					var listHeight = jqList.innerHeight();
					if (itemPos < 0) {
						jqList.scrollTop(itemRelativePos);
					}
					if (itemPos + itemHeight > listHeight) {
						jqList.scrollTop(itemRelativePos + itemHeight - listHeight);
					}
				}
			}
		},
		
		getHighlightedResult: function() {
			return this.jqHighlightedResult;
		},
		
		getHighlightedResultIndex: function() {
			if (!this.jqHighlightedResult) {
				return -1;
			}
			var i = -1;
			var jqList = this.getSearchResultsList();
			jqList.children('li').each(function(index) {
				if ($(this).hasClass('highlighted')) {
					i = index;
					return false;
				}
			});
			return i;
		},
		
		showSearchResults: function() {
			var jqList = this.getSearchResultsList();
			
			// jquery's remove() (invoked via jqList.empty()) will remove event handlers.
			jqList.children('li').each(function() {
				if (this.parentNode) {
					this.parentNode.removeChild(this);
				}
			});
		
			if (jqList.css('display') == 'none') {
				jqList.height(1).css({
					overflow: 'hidden'
				}).show();
			}
			
			var h = 0;
			for (var i = 0; i < this.searchResults.length; i++) {
				var jqItem = this.searchResults[i].getResultListItem();
				jqList.append(jqItem);
				h += jqItem.outerHeight();
				if (i < this.options.maxSuggestionRows) {
					jqList.height(h);
					jqList.css('overflow', 'hidden');
				}
				else if (i == this.options.maxSuggestionRows) {
					jqList.css('overflow', 'auto');
				}
			}
			jqList.width(this.jqContainer.outerWidth());
			var containerOffset = this.jqContainer.offset();
			jqList.css({
				top: (containerOffset.top + this.jqContainer.outerHeight()) + 'px',
				left: (containerOffset.left) + 'px'
			});
			this._searchResultsShown = true;
		},
		hideSearchResults: function() {
			this.getSearchResultsList().fadeOut('fast');
			this._searchResultsShown = false;
		},
		
		handleSearchTextChanged: function(text) {
			if (text.length) {
				if (this.options.minTextLength == 0 || text.length >= this.options.minTextLength) {
					this.dispatchSearch(text);
				}
				else {
					this.handleSearchCompleted([]);
				}
			}
			else {
				if (this.volatileContacts) {
					this.pruneContacts();
				}
				this.hideSearchResults();
			}
		},
		
		highlightPrevResult: function() {
			if (!this.jqHighlightedResult) {
				return;
			}
			var current = this.getHighlightedResultIndex();
			if (current == -1) {
				this.highlightResult(this.searchResults.length - 1);
			}
			else if (current > 0) {
				this.highlightResult(current - 1);
			}
		},

		highlightNextResult: function() {
			if (!this.jqHighlightedResult) {
				return;
			}
			var current = this.getHighlightedResultIndex();
			if (current == -1) {
				this.highlightResult(0);
			}
			else {
				if (current >= 0 && current < this.searchResults.length - 1) {
					this.highlightResult(current + 1);
				}
			}
		},

		setSearchText: function(text) {
			// only accept up to the first comma
			var commaIndex = text.indexOf(',');
			if (commaIndex > -1) {
				text = text.substr(0, commaIndex);
			}
			if (this.jqInlineInput.val() != text) {
				this.jqInlineInput.val(text);
			}
			this.searchText = text;
			this.notifyObservers('searchTextChanged', text, true);
		},

		getSearchText: function() {
			return this.searchText;
		},

		sortKeyedContacts: function() {
			var checkins = {};
			$.each(this.sortedContacts, function(key, value) { checkins[key] = false; });
			this.notifyObservers('sortingStarted');
			var toField = this;
			for (var key in this.sortedContacts) {
				setTimeout((function(key) {
					return function() {
						toField.sortedContacts[key] = toField.contacts.slice(0);	// make a copy (references only)
						toField.currentSortKey = key;
						toField.sortedContacts[key].sort();

						checkins[key] = true;
						var done = true;
						$.each(checkins, function(k, checkedIn) { if (!checkedIn) done = false; });
						if (done) {
							toField.notifyObservers('sortingCompleted');
						}
					};
				})(key), 10);
			}
			this.currentSortKey = null;
		},
		
		calculateSearchParams: function() {
			// try to normalize stuff
			var sum = 0;
			$.each(this.options.searchKeys, (function(i, key) {
				sum += key.hits || 0;
			})._cfBind(this));
			
			$.each(this.options.searchKeys, (function(i, key) {
				var hits = key.hits ? key.hits : 0;
				this.searchHits[key.property] = Math.floor((hits * this.options.maxSuggestions) / sum);
			})._cfBind(this));
		},
		
		dispatchSearch: function(text) {
			var f = (function() {
				var results = this.search(text, this.contacts);
				if (results !== undefined) {
					this.notifyObservers('searchCompleted', results);
				}
				this.keydownTimer = -1;
			})._cfBind(this);

			if (this.keydownTimer > 0) {
				clearTimeout(this.keydownTimer);
			}
			this.keydownTimer = setTimeout(f, this.options.idleDelay);
		},
		

		// Does not remove contacts that are selected.
		pruneContacts: function() {
			var n = this.contacts.length;
			this.contacts = $.grep(this.contacts, function(contact) { return contact.isSelected(); });
		},

		setContacts: function(contacts, internal) {
			if (!internal && this.volatileContacts) {
				// assume that these contacts are here to stay for a while
				this.volatileContacts = false;
			}
			this.pruneContacts();
			var toField = this;
			
			$.each(contacts, function(i, contact) {
				if (!contact.identifier) {
					throw 'Contact ' + (contact.name ? contact.name : '') + ' does not have an identifier.';
				}
				if (!contact._isADuck) {
					contactObj = construct(Contact, [contact, toField]);
					contactObj.addObserver(
						'selectionStateChanged', 
						toField.handleContactSelectionStateChanged._cfBind(toField)
					);
				}
				else {
					// reuse it
					contactObj = contact;
				}
				if (!contactObj.isSelected()) {
					toField.contacts.push(contactObj);
				}
			});
			// don't incur the expense of sorting if we're in volatile mode
			if (!this.volatileContacts) {
				this.sort();
			}
		},
		
		sort: function() {
			this.sortKeyedContacts();
		},
		
		searchPrefixBy: function(key, text, maxHits) {
			maxHits = (maxHits && maxHits > 0) ? maxHits : 0;
			if (this.sortedContacts[key]) {
				var range = this.getRangeWithPrefix(text, key, this.sortedContacts[key], maxHits);
				if (range.found) {
					return this.sortedContacts[key].slice(range.start, range.end + 1);
				}
			}
			return null;
		},
		
		getRangeWithPrefix: function(prefix, key, array, maxHits) {
			maxHits = (maxHits && maxHits > 0) ? maxHits : 0;
			var left = 0;
			var right = array.length - 1;
			prefix = prefix.toLowerCase();
			var found = lastFound = middle = -1;
			// binary search on first letter, then binary search on second letter within
			// the range of all names with the first letter ... and so on.
			for (var prefixIndex = 0; prefixIndex < prefix.length; prefixIndex++) {
				found = this._binaryPrefixSearch(left, right, prefixIndex, prefix, key, array);
				if (found != -1) {
					// found is an index somwhere in a possible range of items with this prefix. expand out both edges to capture
					// all with the prefix. edges should be inclusive. 
					// (that is, it will be true that array[left][key] and array[right][key] will both be prefixed with passed prefix.)
					// the next call to binaryPrefixSearch will be confined to this narrower range.
					left = right = found;
					while ((left - 1 >= 0) && array[left - 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)) == 0) left--;
					while ((right + 1 < array.length) && array[right + 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)) == 0) right++;
					lastFound = found;
				}
				else {
					break;
				}
				middle = found;
			}
			
			if (found >= 0) {
				return { found: true, start: left, end: (maxHits > 0 ? Math.min(left + maxHits - 1, right) : right) };
			}
			return { found: false, start: left, end: right };
		},
		
		_binaryPrefixSeachCmp: function(obj, prefix, charIndex, key) {
			var objName = obj[key].toLowerCase();
			prefix = prefix.toLowerCase();
			if (charIndex >= objName.length || charIndex >= prefix.length) {
				r = objName.length > prefix.length ? 1 : -1;
				return r;
			}
			r = (objName.charAt(charIndex) <= prefix.charAt(charIndex) ? (objName.charAt(charIndex) < prefix.charAt(charIndex) ? -1 : 0) : 1);
			return r;
		},
		
		_binaryPrefixSearch: function(left, right, charIndex, prefix, key, array) {
			if (right == left) {
				if (this._binaryPrefixSeachCmp(array[right], prefix, charIndex, key) == 0) {
					return right;
				}
				return -1;
			}
			while (right > left) {
				var middle = Math.floor((left + right) / 2);
				if (right - left == 1) {
					if (this._binaryPrefixSeachCmp(array[right], prefix, charIndex, key) == 0) {
						return right;
					}
					if (this._binaryPrefixSeachCmp(array[left], prefix, charIndex, key) == 0) {
						return left;
					}
				}
				var c = this._binaryPrefixSeachCmp(array[middle], prefix, charIndex, key);
				if (c > 0) {
					if (right == middle) {
						return -1;
					}
					right = middle;
				}
				else if (c < 0) {
					if (left == middle) {
						return -1;
					}
					left = middle;
				}
				else {
					return middle;
				}
			}
			return -1;
		},

		searchExactBy: function(key, text) {
			if (!this.volatileContacts) { // they are sorted; we can use binary search
				if (this.sortedContacts[key]) {
					return this.binarySearch(text, key, this.sortedContacts[key]);
				}
			}
			for (var i = 0; i < this.contacts.length; i++) {
				if (this.contacts[i][key] == text) {
					return this.contacts[i];
				}
			}
			return null;
		},

		binarySearch: function(match, key, array) {
			var searchState = { left: -1, right: -1, middle: -1, result: null };
			var searchTimer = null;
			var found = false;
			
			searchState = this._statefulBSearch(match, key, array, searchState);
			if ((searchState.left >= 0 && (searchState.left == searchState.middle || searchState.right == searchState.middle)) || searchState.result) {
				if (searchState.result) {
					found = searchState.result;
				}
			}
			return found;
		},
		
		// without the overhead of the prefix stuff ...
		_statefulBSearch: function(match, key, sortedArray, state, iterations) {
			match = match.toLowerCase();
			state.left = (state.left >= 0 ? state.left : 0);
			state.right = (state.right >= 0 ? state.right : sortedArray.length - 1);
			state.middle = (state.middle >= 0 ? state.middle : Math.floor(state.right / 2));
			if (!iterations) {
				iterations = sortedArray.length;
			}
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
		
		mergeContacts: function(data) {
			var existing = null;
			var newContacts = this.contacts.slice(0); // new copy
			for (var i = 0; i < data.length; i++) {
				existing = this.searchExactBy('identifier', data[i].identifier);
				if (!existing) {
					newContacts.push(data[i]);
				}
			}
			this.setContacts(newContacts, true);
		},

		handleExternalSearchResults: function(data, status) {
			this.volatileContacts = true;
			this.mergeContacts(data);
			var ids = $.map(data, function(item, i) { return item.identifier; });
			this.notifyObservers(
				'searchCompleted', 
				$.grep(this.contacts, function(item, i) { return ($.inArray(item.identifier, ids) != -1); })
			);
		},
		
		handleSearchCompleted: function(results) {
			var oldHighlightedIndex = this.getHighlightedResultIndex();
			var oldHighlightedContact = this.searchResults[oldHighlightedIndex];

			this.searchResults = [];
			for (var i = 0; i < results.length; i++) {
				if (!results[i].isSelected()) {
					this.searchResults.push(results[i]);
				}
			}

			if (this.options.acceptAdHoc) {
				this.searchResults.unshift(this.getMirrorContact());
			}
			else if (this.searchResults.length == 0) {
				var mirror = this.getMirrorContact();
				if (this.searchText.length < this.options.minTextLength) {
					mirror.setSelectable(false, this.options.minTextLength + '-character minimum');
				}
				else {
					mirror.setSelectable(false);
				}

				this.searchResults.push(mirror);
			}			

			this.showSearchResults();
						
			if ((results.length == 0 && this.options.acceptAdHoc) || !oldHighlightedContact) {
				this.highlightResult(0);	// mirror
			}
			else if (results.length == 1 && this.searchResults.length == 2) {
				// if only one result, highlight it.
				this.highlightResult(1);
			}
			else if (oldHighlightedContact) {
				var found = false;
				for (var i = 0; i < this.searchResults.length; i++) {
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
		
		handleSortingCompleted: function() {
			if (this.options.ready) {
				this.options.ready(this);
			}
		},
		
		layoutContainer: function() {
			var containerHeight = this.jqContainer.innerHeight();
			var contentHeight = 0;
			var tokenRowHeight = 0;
			var rows = 0;
			var inputRowHeight = this.jqInlineInputContainer.outerHeight(true);
			var contentHeight = inputRowHeight;
			var lastY = -1;
			var pos = 0;
			var toField = this;
			this.jqContainer.children().each(function() {
				var jqThis = $(this);
				var maxWidth = jqThis.parent().innerWidth() - toField.options.scrollbarSize;
				if (toField.options.truncateTokenToFit && jqThis.outerWidth() > maxWidth) {
					toField.options.truncateTokenToFit(jqThis, maxWidth);
				}
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
				this.jqContainer.css('overflow-x', 'hidden');
				var inputLeft = this.jqInlineInput.position().left;
				var diff = this.jqContainer.innerWidth() - (inputLeft + this.jqInlineInput.outerWidth());
				if (diff < this.options.scrollbarSize) {
					this.jqInlineInput.width(this.jqInlineInput.width() - this.options.scrollbarSize);
				}
			}
			else {
				this.jqContainer.height((tokenRowHeight * (rows - 1)) + inputRowHeight);
				this.jqContainer.css('overflow', 'hidden');
				this.jqContainer.scrollTop(0);
			}
		}
	});
	
	var Contact = function(data, toField) {
		this.toField = toField;
		$.extend(this, data);
		var x = this;
		// ie6 won't recognize toString() in the prototype, so promote it to local property.
		this.toString = this._toString;
		return this;
	};
	$.extend(true, Contact.prototype, Observable, {
		toField: null,
		name: '',
		identifier: '',
		customClass: '',
		selected: false,
		jqListItem: null,
		
		_isADuck: true,
		
		setName: function(name) {
			this.name = name;
			this.notifyObservers('nameChanged', name, true);
		},
		setIdentifier: function(identifier) {
			this.identifier = identifier;
			this.notifyObservers('identifierChanged', identifier, true);
		},
		getCustomClass: function() {
			return this.customClass;
		},
		select: function() {
			this.selected = true;
			this.notifyObservers('selectionStateChanged', { contact: this, state: true });
		},
		deselect: function() {
			this.selected = false;
			this.notifyObservers('selectionStateChanged', { contact: this, state: false });
		},
		isMirror: function() {
			return false;
		},
		isSelected: function() {
			return this.selected;
		},
		isEqualToContact: function(contact) {
			return (this.identifier == contact.identifier);
		},
		getResultListItem: function() {
			if (!this.jqListItem) {
				this.jqListItem = this.toField.createResultListItem(this);
			}
			return this.jqListItem;
		},
		clearResultListItem: function() {
			this.jqListItem = null;
		},
		_toString: function() {
			if (this.toField.currentSortKey) {
				return this[this.toField.currentSortKey];
			}
			return this.name;
		}
	});

	var MirrorContact = function(data, toField) {
		this.superclass.prototype.constructor.apply(this, arguments);
		this.handleSearchTextChanged = this.handleSearchTextChanged._cfBind(this);	// heh. grumble grumble
		toField.addObserver('searchTextChanged', this.handleSearchTextChanged);
		this.handleSearchTextChanged(toField.getSearchText());	// get initial text
		return this;
	};
	$.extend(true, MirrorContact.prototype, Contact.prototype, {
		superclass: Contact,	// kinda-sorta inheritance ... meh.
		selectable: true,
		select: function() {
			if (this.selectable) {
				this.toField.removeObserver('searchTextChanged', this.handleSearchTextChanged);
				this.superclass.prototype.select.apply(this);
			}
		},
		isMirror: function() {
			return true;
		},
		getResultListItem: function() {
			var item = this.superclass.prototype.getResultListItem.apply(this);
			if (!item.hasClass('mirror')) {
				item.addClass('mirror');
			}
			return item;
		},
		handleSearchTextChanged: function(text) {
			if (this.selectable) {
				this.setIdentifier(text);
				this.setName(text);
				this.getResultListItem().html($(this.toField.getResultItemMarkup(this)).html());	// preserve the node and jquery object
			}
		},
		setSelectable: function(selectable, message) {
			this.selectable = selectable;
			if (!this.selectable) {
				this.setIdentifier(message || 'No Match');
				this.setName(message || 'No Match');
				this.getResultListItem().html($(this.toField.getResultItemMarkup(this)).html());
			}
		}
	});

	var Token = function(contact, toField) {
		this.contact = contact;
		this.toField = toField;
		this.jqContainer = toField.jqContainer;
		contact.addObserver('selectionStateChanged', this.handleContactSelectionStateChanged._cfBind(this));
		this.jqToken = $(toField.getContactTokenMarkup(contact));
		if (contact.getCustomClass().length) {
			this.jqToken.addClass(contact.getCustomClass());
		}
		var token = this;
		this.jqToken.hover(
			function(event) {
				token.jqToken.addClass('token-hover');
			},
			function(event) {
				token.jqToken.removeClass('token-hover');
				token.jqToken.removeClass('x-hover');
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
			var paddingLeft = parseInt(this.jqToken.css('padding-left'), 10);
			var paddingRight = parseInt(this.jqToken.css('padding-right'), 10);
			paddingLeft = isNaN(paddingLeft) ? 0 : paddingLeft;
			paddingRight = isNaN(paddingRight) ? 0 : paddingRight;
			var xLeft = this.jqToken.innerWidth() - paddingRight;
			var elementXPos = this.jqToken.offset().left;
			return (pageX - elementXPos > xLeft);
		},
		handleMouseMove: function(event) {
			if (this.pointIsOverX(event.pageX, event.pageY)) {
				this.jqToken.addClass('x-hover');
			}
			else {
				this.jqToken.removeClass('x-hover');
			}
			return false;
		},
		
		handleClick: function(event) {
			if (this.pointIsOverX(event.pageX, event.pageY)) {
				this.contact.deselect();
			}
		}
	});

	if (!Array.prototype.indexOf) {
		Array.prototype.indexOf = function(elt /*, from*/) {
			var len = this.length;

			var from = Number(arguments[1]) || 0;
			from = (from < 0) ? Math.ceil(from) : Math.floor(from);
			if (from < 0)
				from += len;

			for (; from < len; from++) {
				if (from in this && this[from] === elt) return from;
			}
			return -1;
		};
	}


})(jQuery);