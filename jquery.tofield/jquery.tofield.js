/*
 * jQuery To: Field Plugin 1.0
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

	// Globally overridable static methods. Set before first toField initialization.
	// During execution, `this` will refer to the appropriate ToField object.

	/**
	 * 
	 */
	$.fn.toField.search = function(text) {
		var results = [];
		var suggestionsToGo = this.options.maxSuggestions;

		for (var i = 0; i < this.options.searchKeys.length && suggestionsToGo > 0; i++) {
			key = this.options.searchKeys[i].property;
			if (this.options.searchKeys[i].search) {
				// "hit weights" feature not ready
				//var hits = this.options.searchKeys[i].search(key, text, Math.min(suggestionsToGo, this.searchHits[key]));
				//console.log('user-supplied search for key ' + key);
				var hits = this.options.searchKeys[i].search(this.contacts, key, text, suggestionsToGo);
				//if (hits) console.log('... found ' + hits.length);
			}
			else {
				// "hit weights" feature not ready
				//var hits = this.searchPrefixBy(key, text, Math.min(suggestionsToGo, this.searchHits[key]));
				//console.log('internal search for key ' + key);
				var hits = this.searchPrefixBy(key, text, suggestionsToGo);
				//if (hits) console.log('... found ' + hits.length);
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


	$.fn.toField.getResultItemMarkup = function(contact) {
		return '\
			<li class="search-result">\
				' + (!contact.isMirror() ? '<div class="contact-name">' + contact.name + '</div>' : '') + '\
				<div class="contact-identifier">&lt;' + contact.identifier + '&gt;</div>\
			</li>';
	};
	
	$.fn.toField.getContactTokenMarkup = function(contact) {
		var customClass = contact.getCustomClass();
		return '\
			<a href="javascript:void(0)" title="' + contact.identifier + '" class="contact-token' + (customClass.length ? ' ' + customClass : '') + '">\
				' + (contact.name.length ? contact.name.replace(' ', '&nbsp;') : contact.identifier) + '\
			</a>';
	};
	console.log('wtf1');
	$.fn.toField.setFormInput = function(contacts, jqInput) {
		jqInput.val($.map(contacts, function(contact) { return contact.identifier; }).join(','));
	};

	$.fn.toField.defaults = {
		contacts: [],
		maxTokenRows: 4,
		maxSuggestions: 10,
		maxSuggestionRows: 5,
		acceptAdHoc: true,
		idleDelay: 100,
		scrollbarSize: 18,
		searchKeys: [ 'name', 'identifier' ],
		search: $.fn.toField.search,
		setFormInput: $.fn.toField.setFormInput,
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
		
		if (typeof options.contacts == 'function') {
			this.setContacts(options.contacts(), true);
		}
		else {
			this.setContacts(options.contacts, true);
		}
		
		this.options.maxSuggestionRows = Math.max(2, this.options.maxSuggestionRows);
		this.options.maxTokenRows = Math.max(2, this.options.maxTokenRows);
		
		this._windowKeyDownHandler = null;
		this._mouseOverSearchResultsList = false;
		//this._windowMouseDownHandler = null;
		this._searchResultsShown = false;

		var w = jqFormInput.innerWidth();
		var h = jqFormInput.innerHeight();
		this.jqContainer = $('<div class="to-field"></div>').width(w).height(h);
		jqFormInput.hide().before(this.jqContainer);
		this.insertInlineInput(false);
		this.jqContainer.mousedown(this.handleMouseDown._cfBind(this));
		this.jqContainer.mouseup(this.handleMouseUp._cfBind(this));

		this.addObserver('searchTextChanged', this.handleSearchTextChanged._cfBind(this));
		this.addObserver('searchCompleted', this.handleSearchCompleted._cfBind(this));
		this.calculateSearchParams();
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
			//console.log('mouse down in ' + this.jqFormInput.attr('name'));
			if (event.target == this.jqContainer.get(0) || event.target == this.jqInlineInputContainer.get(0)) {
				if (!this.probablyHasScrollbars() || !this.pointOverScrollbars(event.pageX, event.pageY)) {
					this.insertInlineInput();
				}
			}
		},
		handleMouseUp: function(event) {
		},
		
		probablyHasScrollbars: function() {
			return this.jqContainer.css('overflow') == 'auto';
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
				var value = this.jqInlineInput.val();
				if (this.searchText != value) {
					this.setSearchText(value);
				}
			})._cfBind(this));
			
			this.jqInlineInput.blur((function(event) {
				setTimeout((function() {
					if (!this._mouseOverSearchResultsList) {	// yay ie.
						this.hideSearchResults();
					}
				})._cfBind(this), 1);
			})._cfBind(this));
			
			this.jqInlineInput.focus((function() {
				if (this.searchText.length) {
					this.showSearchResults();
				}
			})._cfBind(this));

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
		
		/**
		 * First argument can be a jQuery-ed list item or an index into the list.
		 */
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
			//console.log(jqItem);
			
			if (this.jqHighlightedResult) {
				this.jqHighlightedResult.addClass('highlighted');
				if (scrollBehavior == undefined || scrollBehavior == 'scroll') {
					var itemPos = this.jqHighlightedResult.position().top;
					var itemHeight = this.jqHighlightedResult.outerHeight();
					var scrollPos = jqList.scrollTop();
					var itemRelativePos = itemPos + scrollPos;
					var listHeight = jqList.innerHeight();
					//itemPos += (!$.support.boxModel ? scrollPos : 0);
					if (itemPos < 0) {
						jqList.scrollTop(itemRelativePos);
					}
					if (itemPos + itemHeight > listHeight) {
						jqList.scrollTop(itemRelativePos + itemHeight - listHeight);
						//jqList.scrollTop(scrollPos + ((itemPos + itemHeight) - (scrollPos + listHeight)));
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
				this.dispatchSearch(text);
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
			this.notifyObservers('searchTextChanged', text, true);
		},

		getSearchText: function() {
			return this.searchText;
		},

		sortKeyedContacts: function() {
			for (var key in this.sortedContacts) {
				this.sortedContacts[key] = this.contacts.slice(0);	// make a copy (references only)
				this.currentSortKey = key;
				this.sortedContacts[key].sort();
			}
			this.currentSortKey = null;
		},
		
		calculateSearchParams: function() {
			// try to normalize stuff
			var sum = 0;
			//var order = [];
			//this.searchOrder = [];
			$.each(this.options.searchKeys, (function(i, key) {
				sum += key.hits || 0;
				//this.searchOrder.push(key.property);
			})._cfBind(this));
			
			$.each(this.options.searchKeys, (function(i, key) {
				var hits = key.hits ? key.hits : 0;
				this.searchHits[key.property] = Math.floor((hits * this.options.maxSuggestions) / sum);
			})._cfBind(this));
			
			/*
			for (var key in this.options.searchKeys) {
				sum += this.options.searchKeys[key].hits || 0;
				order.push({ key: key, order: this.options.searchKeys[key].order || Number.MAX_VALUE });
			}
			//console.dir(order);
			order.sort(function(a, b) { return a.order - b.order });
			this.searchOrder = $.map(order, function(o) { return o.key; });
			for (var key in this.options.searchKeys) {
				this.searchHits[key] = Math.floor(((this.options.searchKeys[key].hits || 0) * this.options.maxSuggestions) / sum);
			}
			*/
			//console.dir(this.searchHits);
			//console.dir(this.searchOrder);
		},
		/*
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
		* */
		
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
		
		/**
		 * Does not remove contacts that are selected.
		 */
		pruneContacts: function() {
			var n = this.contacts.length;
			//console.dir(this.contacts);
			this.contacts = $.grep(this.contacts, function(contact) { return contact.isSelected(); });
			//console.log('pruned ' + (n - this.contacts.length) + ' contacts, now have ' + this.contacts.length + ' contacts' );
		},

		setContacts: function(contacts, internal) {
			if (!internal && this.volatileContacts) {
				// assume that these contacts are here to stay for a while
				this.volatileContacts = false;
			}
			this.pruneContacts();
			var toField = this;
			//console.log('setting contacts:');
			//console.dir(contacts);
			
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
					//console.log('contact ' + contact.name + ' is a duck');
					contactObj = contact;
				}
				if (!contactObj.isSelected()) {
					toField.contacts.push(contactObj);
				}
				//console.log(toField.getFormName() + ' is observing ' + contactObj.name + ' for selectionStateChanged');
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
				//console.log('------ key search: searching ' + key + ' for ' + text + '------');
				//console.dir(this.sortedContacts[key]);
				var range = this.getRangeWithPrefix(text, key, this.sortedContacts[key], maxHits);
				if (range.found) {
					//console.log('found:');
					//console.dir(this.sortedContacts[key].slice(range.start, range.end + 1));
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
			// console.log('walking through prefix ' + prefix + ' on array with items (' + ($.map(array, function(item) { return item[key]; })).join(', ') + ')');
			for (var prefixIndex = 0; prefixIndex < prefix.length; prefixIndex++) {
				// console.log('calling _binaryPrefixSearch with left: ' + left + ', right: ' + right + ', prefixIndex: ' + prefixIndex + ', key: ' + key);
				found = this._binaryPrefixSearch(left, right, prefixIndex, prefix, key, array);
				if (found != -1) {
					// found is an index somwhere in a possible range of items with this prefix. expand out both edges to capture
					// all with the prefix. edges should be inclusive. 
					// (that is, it will be true that array[left][key] and array[right][key] will both be prefixed with passed prefix.)
					// the next call to binaryPrefixSearch will be confined to this narrower range.
					// console.log('found char ' + prefixIndex + ' of ' + prefix + ' in key ' + key + ' at index ' + found + ', expanding...');
					left = right = found;
//					while ((left - 1 >= 0) && (array[left - 1][key].charAt(prefixIndex).toLowerCase() == prefix.charAt(prefixIndex))) left--;
//					while ((right + 1 < array.length) && (array[right + 1][key].charAt(prefixIndex).toLowerCase() == prefix.charAt(prefixIndex))) right++;

					while ((left - 1 >= 0) && array[left - 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)) == 0) {
						// console.log('expanding left - 1. array[left - 1][key] = ' + array[left - 1][key] + ', prefix.substr(0, prefixIndex + 1) = ' + prefix.substr(0, prefixIndex + 1) + ', array[left - 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)): ' + array[left - 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)))
						left--;
					};
					while ((right + 1 < array.length) && array[right + 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)) == 0) {
						// console.log('expanding right + 1. array[right + 1][key] = ' + array[right + 1][key] + ', prefix.substr(0, prefixIndex) = ' + prefix.substr(0, prefixIndex + 1) + ', array[right + 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)): ' + array[right + 1][key].toLowerCase().indexOf(prefix.substr(0, prefixIndex + 1)))
						right++;
					};
					// console.log('... range with prefix ' + prefix + ' is now (left, found, right): ' + left + ', ' + found + ', ' + right + ', (' + array[left][key] + ', ' + array[found][key] + ', ' + array[right][key] + ')');
					lastFound = found;
				}
				else {
					// console.log('did not find char ' + prefixIndex + ' of prefix ' + prefix +  ' in key ' + key + ', breaking with found = -1');
					break;
				}
				middle = found;
			}
			
			if (found >= 0) {
				// console.log('made it through ' + prefixIndex + ' chars of prefix, returning found == true, start: ' + left + ' (' + array[left][key] + '), end: ' + right + ' (' + array[right][key] + ')');
				return { found: true, start: left, end: (maxHits > 0 ? Math.min(left + maxHits - 1, right) : right) };
			}
			// console.log('could not find any items with prefix ' + prefix + ' in key ' + key);
			return { found: false, start: left, end: right };
		},
		
		_binaryPrefixSeachCmp: function(obj, prefix, charIndex, key) {
			// console.log('>> comparing char ' + charIndex + ' of ' + obj[key] + ' and ' + prefix + ' ... ');
			if (!obj[key]) {
				//console.log('key: ' + key);
				//console.dir(obj);
				//console.trace();
			}
			var objName = obj[key].toLowerCase();
			prefix = prefix.toLowerCase();
			if (charIndex >= objName.length || charIndex >= prefix.length) {
				r = objName.length > prefix.length ? 1 : -1;
				// console.log('>> result: ' + r);
				return r;
			}
			r = (
				objName.charAt(charIndex) <= prefix.charAt(charIndex) ? (
					objName.charAt(charIndex) < prefix.charAt(charIndex) ? -1 : 0
				) : 1
			);
			//console.log('>> result: ' + r);
			return r;
		},
		
		_binaryPrefixSearch: function(left, right, charIndex, prefix, key, array) {
			//console.log('running binary search between ' + array[left][key] + ' and ' + array[right][key] + ' for char ' + charIndex + ' of prefix ' + prefix);
			if (right == left) {
				if (this._binaryPrefixSeachCmp(array[right], prefix, charIndex, key) == 0) {
					//console.log(' ... right == left and it\'s a match, returning right, ' + array[right][key]);
					return right;
				}
				//console.log(' ... right == left and no match, returning -1');
				return -1;
			}
			while (right > left /*&& (right - left > 2)*/) {
				var middle = Math.floor((left + right) / 2);
				//console.log('>> left, middle, right : ' + left + ', ' + middle + ', ' + right + ' (' + array[left][key] +', ' + array[middle][key] + ', ' + array[right][key] + ')');
				if (right - left == 1) {
					if (this._binaryPrefixSeachCmp(array[right], prefix, charIndex, key) == 0) {
						//console.log(' ... early returning right, ' + array[right][key]);
						return right;
					}
					if (this._binaryPrefixSeachCmp(array[left], prefix, charIndex, key) == 0) {
						//console.log(' ... early returning left, ' + array[left][key]);
						return left;
					}
				}

				var c = this._binaryPrefixSeachCmp(array[middle], prefix, charIndex, key);
				if (c > 0) {
					if (right == middle) {
						//console.log(' ... right = middle, middle evaluated to 1; not found, returning -1');
						return -1;
						//console.log(' ... returning right, ' + array[right][key]);
						//return right;
					}
					right = middle;
				}
				else if (c < 0) {
					if (left == middle) {
						//console.log(' ... left = middle, middle evaluated to -1; not found, returning -1');
						return -1;
						//console.log(' ... returning left, ' + array[left][key]);
						//return left;
					}
					left = middle;
				}
				else {
					//console.log(' ... returning middle, ' + array[middle][key]);
					return middle;
				}
			}
			return -1;
		},

		searchExactBy: function(key, text) {
			//console.log('search by ' + key + ' for ' + text + ', sorted contacts: ');
			//console.dir(this.sortedContacts[key]);
			if (!this.volatileContacts) { // they are sorted; we can use binary search
				if (this.sortedContacts[key]) {
					return this.binarySearch(text, key, this.sortedContacts[key]);
				}
			}
			// resort to a linear search
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
			var sleep = 30;
			
			searchState = this._statefulBSearch(match, key, array, searchState);
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
			//console.log('merge ' + contacts.length + ' incoming contacts into current list with ' + this.contacts.length + ' ... ');
			var newContacts = this.contacts.slice(0); // new copy
			for (var i = 0; i < data.length; i++) {
				existing = this.searchExactBy('identifier', data[i].identifier);
				if (!existing) {
					newContacts.push(data[i]);
				}
				else {
					//console.log(existing.name + ' already cached');
				}
			}
			this.setContacts(newContacts, true);
			//console.log('done, current lenght: ' + this.contacts.length);
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
			//console.log('handleSearchCompleted');
			var oldHighlightedIndex = this.getHighlightedResultIndex();
			var oldHighlightedContact = this.searchResults[oldHighlightedIndex];

			this.searchResults = [];
			if (this.options.acceptAdHoc) {
				this.searchResults.push(this.getMirrorContact());
			}
			for (var i = 0; i < results.length; i++) {
				if (!results[i].isSelected()) {
					this.searchResults.push(results[i]);
				}
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
				if (jqThis.outerWidth() > maxWidth) {
					truncateToFit(jqThis, maxWidth);
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
		// if (browser.is.stupid) ... ie6 won't recognize toString() in the prototype, so promote it to local property.
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
			//console.log(this.name + '\'s observers: ');
			//console.dir(this.observers);
			//console.log(this.name + ' select() called');
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
		select: function() {
			this.toField.removeObserver('searchTextChanged', this.handleSearchTextChanged);
			this.superclass.prototype.select.apply(this);
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
			this.setIdentifier(text);
			this.setName(text);
			this.getResultListItem().html($(this.toField.getResultItemMarkup(this)).html());	// preserve the node and jquery object
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
		truncateIndex: -1,
		
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
/*		
		truncateToFit: function(width) {
			var w = this.jqToken.outerWidth();

			// this is ugly.
			var originalContact = this.contact;
			this.contact = $.extend(true, {}, this.contact);
			while (w > width) {
				this.contact.name = this.contact.name.substr(0, this.contact.name.length - 2) + '&hellip;';
				this.jqToken.html($(toField.getContactTokenMarkup(contact)).html());
			}
			this.contact = this.originalContact;
		},
*/
		handleMouseMove: function(event) {
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

	var truncateToFit = function(jqItem, width) {
		var node = jqItem.get(0);
		if (node) {
			var safety = 0;
			// node[property] doesn't seem to work as a setter ...
			if (node.textContent) {
				node.textContent = $.trim(node.textContent);
				while (jqItem.outerWidth(true) > width && safety++ < 100) {
					node.textContent = node.textContent.substr(0, node.textContent.length - 2) + $('<p>&#133;</p>').html();		// um
				}
			}
			else if (node.innerText) {
				node.textContent = $.trim(node.textContent);
				while (jqItem.outerWidth(true) > width && safety++ < 100) {
					node.innerText = node.innerText.substr(0, node.innerText.length - 2) + $('<p>&#133;</p>').html();		// um
				}
			}
		}
	};

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