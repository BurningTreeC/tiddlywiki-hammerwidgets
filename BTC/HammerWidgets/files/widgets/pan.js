/*\
title: $:/plugins/tiddlywiki/hammerjs/widgets/pan.js
type: application/javascript
module-type: widget

actions triggered on pan gestures + event coordinates

\*/
(function (global) {

"use strict";
/*jslint node: true, browser: true */
/*global $tw: false */

var Widget = require("$:/core/modules/widgets/widget.js").widget;

if (typeof window !== 'undefined' && !window.Hammer) {
	require("$:/plugins/tiddlywiki/hammerjs/hammer.js");
}

var PanWidget = function(parseTreeNode,options) {
	this.initialise(parseTreeNode,options);
};

/*
Inherit from the base widget class
*/
PanWidget.prototype = new Widget();

/*
Render this widget into the DOM
*/
PanWidget.prototype.render = function(parent,nextSibling) {
	var self = this;
	var parentDomNode = parent;

	// Compute attributes and execute state
	this.computeAttributes();
	this.execute();

	var panDomNode = this.document.createElement(this.panTag);
	panDomNode.setAttribute("class",this.panClass);
	parent.insertBefore(panDomNode,nextSibling);
	this.domNodes.push(panDomNode);
	this.renderChildren(panDomNode,null);

	if(window.Hammer) {

		var panStartValues = [];
		var precision = this.userToFixed;
		var panState = this.panStateTiddler;

		var hammer = new Hammer.Manager(panDomNode);

		hammer.add(new Hammer.Pan({
			event: 'pan',
			pointers: self.panPointers,
			threshold: self.panThreshold,
			direction: Hammer.DIRECTION_ALL
		}));

		hammer.get('pan');

		var scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
			  scrollTop = window.pageYOffset || document.documentElement.scrollTop;

		var startActions = null;
		var domNodeRect = null;
		var parentDomNodeRect = null;

		var fieldStartNames = [ 'starting-x', 'starting-y', 'element-top', 'element-left', 'element-bottom', 'element-right', 'element-width', 'element-height', 'pointer-type', 'parent-x', 'parent-y', 'parent-classname', 'absolute-x', 'absolute-y'];

		hammer.on('touchmove panstart panmove', function(e) {
			// Prevent default behaviour
			e.preventDefault && e.preventDefault();
			e.stopPropagation && e.stopPropagation();

			//Caching values, big performance impact
			var pointerCenter = e.center,
				pointerCenterX = pointerCenter.x.toFixed(precision),
				pointerCenterY = pointerCenter.y.toFixed(precision),
				pointerDeltaX = e.deltaX.toFixed(precision),
				pointerDeltaY = e.deltaY.toFixed(precision),
				panAltKey = e.changedPointers[0].altKey,
				panCtrlKey = e.changedPointers[0].ctrlKey,
				panShiftKey = e.changedPointers[0].shiftKey,
				panMetaKey = e.changedPointers[0].metaKey,
				parentDomNodeClassName;

			// Get the coordinates of the parent Dom Node
			if (parentDomNodeRect === null && parentDomNode !== undefined && parentDomNode.offsetParent !== undefined && parentDomNode.offsetParent !== null) {
				parentDomNodeRect = parentDomNode.offsetParent.getBoundingClientRect();
				parentDomNodeClassName = parentDomNode.offsetParent.className;
			}

			// Get the current coordinates of the element
			if (domNodeRect === null) {
				domNodeRect = panDomNode.getBoundingClientRect();
			}

			if (self.panStartActions && startActions !== "done") {
				self.invokeActionString(self.panStartActions,self,e);
				startActions = "done";
			}

			// Absolute coordinates of the pointer
			var elementAbsoluteLeft = e.changedPointers[0].pageX; //(e.center.x + scrollLeft).toFixed(precision);
			var elementAbsoluteTop = e.changedPointers[0].pageY; //(e.center.y + scrollTop).toFixed(precision);
			// Set values at pan-start only
			if (panStartValues.length === 0) {
				var domNodeTop = domNodeRect.top.toFixed(precision),
					domNodeLeft = domNodeRect.left.toFixed(precision),
					domNodeRight = domNodeRect.right.toFixed(precision),
					domNodeBottom = domNodeRect.bottom.toFixed(precision),
					domNodeWidth = domNodeRect.width.toFixed(precision),
					domNodeHeight = domNodeRect.height.toFixed(precision),
					domNodeParentLeft,
					domNodeParentTop;
				if(parentDomNodeRect) {
					domNodeParentLeft = parentDomNodeRect.left.toFixed(precision) || "undefined",
					domNodeParentTop = parentDomNodeRect.top.toFixed(precision) || "undefined";
				} else {
					domNodeParentLeft = "undefined",
					domNodeParentTop = "undefined";
				}

				panStartValues[0] = pointerCenterX;
				panStartValues[1] = pointerCenterY;
				panStartValues[2] = domNodeTop;
				panStartValues[3] = domNodeLeft;
				panStartValues[4] = domNodeBottom;
				panStartValues[5] = domNodeRight;
				panStartValues[6] = domNodeWidth;
				panStartValues[7] = domNodeHeight;
				panStartValues[8] = e.pointerType;
				panStartValues[9] = domNodeParentLeft;
				panStartValues[10] = domNodeParentTop;
				panStartValues[11] = parentDomNodeClassName;
				panStartValues[12] = elementAbsoluteLeft;
				panStartValues[13] = elementAbsoluteTop;

				for(var t = 0; t<panStartValues.length; t++){
					self.setField(panState,fieldStartNames[t],panStartValues[t]);
				}
			}

			self.setField(panState,'delta-x',pointerDeltaX);
			self.setField(panState,'delta-y',pointerDeltaY);
			self.setField(panState,'relative-x',pointerCenterX);
			self.setField(panState,'relative-y',pointerCenterY);
			self.setField(panState,'absolute-x',elementAbsoluteLeft);
			self.setField(panState,'absolute-y',elementAbsoluteTop);
			self.setField(panState,'alt-key',panAltKey);
	        self.setField(panState,'ctlr-key',panCtrlKey);
	        self.setField(panState,'shift-key',panShiftKey);
			self.setField(panState,'meta-key',panMetaKey);
		})

		.on('panend pancancel touchend mouseup', function(e) {

			startActions = null;
			domNodeRect = null;
			parentDomNodeRect = null;
			panStartValues = [];

			if(self.panEndActions) {
				self.invokeActionString(self.panEndActions,self,e);
			}
			return true;
		});
	}
};


/*
Set the computed values in the state-tiddler fields
*/
PanWidget.prototype.setField = function(tiddler,field,value) {
	$tw.wiki.setText(tiddler,field,undefined,value,{ suppressTimestamp: true });
};

/*
Compute the internal state of the widget
*/
PanWidget.prototype.execute = function() {
	this.panClass = this.getAttribute("class", "tc-pan-element");
	this.panTag = this.getAttribute("tag", "div");
	this.panStateTiddler = this.getAttribute("state","$:/state/pan");
	this.panPointers = parseInt(this.getAttribute("pointers","1"));
	this.panThreshold = parseInt(this.getAttribute("threshold","0"));
	this.userToFixed = parseInt(this.getAttribute("decimals","0"));
	this.panStartActions = this.getAttribute("startactions","");
	this.panEndActions = this.getAttribute("endactions","");
	this.makeChildWidgets();
};

/*
Selectively refreshes the widget if needed. Returns true if the widget or any of its children needed re-rendering
*/
PanWidget.prototype.refresh = function(changedTiddlers) {
	var self = this;
	var changedAttributes = this.computeAttributes();
	if(changedAttributes.class || changedAttributes.tag || changedAttributes.state || changedAttributes.pointers || changedAttributes.threshold || 
		changedAttributes.decimals || changedAttributes.startactions || changedAttributes.endactions) {
		self.refreshSelf();
		return true;
	}
	return this.refreshChildren(changedTiddlers);
};

exports.pan = PanWidget;
})();
