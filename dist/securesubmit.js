(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (factory((global.Heartland = global.Heartland || {})));
}(this, (function (exports) { 'use strict';

/// <reference path="vars/defaults.ts" />
/// <reference path="vendor/json2.ts" />
/// <reference path="Ajax.ts" />
/// <reference path="DOM.ts" />
/// <reference path="Events.ts" />
/// <reference path="Frames.ts" />
/// <reference path="Messages.ts" />
/// <reference path="Styles.ts" />
/// <reference path="Util.ts" />
var Heartland;
(function (Heartland) {
    /**
     * Heartland.HPS
     *
     * Initializes options and adds the default form handler if a `formId` is
     * passed as an option. This expects the default fields (see `getFields`) to
     * be present as children of `formId`.
     */
    var HPS = (function () {
        /**
         * Heartland.HPS (constructor)
         *
         * @constructor
         * @param {Heartland.Options} options [optional]
         * @returns {Heartland.HPS}
         */
        function HPS(options) {
            if (!options && window.parent) {
                return;
            }
            this.options = Heartland.Util.applyOptions(defaults, options);
            this.options = Heartland.Util.getUrlByEnv(this.options);
            if (this.options.formId.length > 0) {
                Heartland.Util.addFormHandler(this.options);
            }
            this.frames = {};
            if (this.options.type === 'iframe') {
                this.iframe_url = '';
                this.Messages = new Heartland.Messages(this);
                this.mailbox = [];
                this.cacheBust = 1;
                Heartland.Frames.configureIframe(this);
            }
            return this;
        }
        /**
         * Heartland.HPS.tokenize
         *
         * Tokenizes card data. Used in manual integrations where the merchant's
         * credit card fields cannot/do not match the names expected in the default
         * form handler (see `getFields`).
         *
         * @param {Heartland.Options} options [optional]
         */
        HPS.prototype.tokenize = function (options) {
            options = options || {};
            if (options) {
                this.options = Heartland.Util.applyOptions(this.options, options);
                this.options = Heartland.Util.getUrlByEnv(this.options);
            }
            if (this.options.type === 'iframe') {
                this.Messages.post({
                    action: 'tokenize',
                    message: this.options.publicKey
                }, 'child');
                return;
            }
            Heartland.Ajax.call(this.options.type, this.options);
        };
        ;
        /**
         * Heartland.HPS.configureInternalIframe
         *
         * Sets up a child iframe window to prepare it for communication with the
         * parent and for tokenization.
         *
         * @param {Heartland.Options} options
         */
        HPS.prototype.configureInternalIframe = function (options) {
            this.Messages = new Heartland.Messages(this);
            this.parent = window.parent;
            this.frames = this.frames || {};
            this.frames.parent = {
                frame: window.parent,
                name: 'parent',
                url: decodeURIComponent(document.location.hash.replace(/^#/, ''))
            };
            this.loadHandler = (function (hps) {
                return function () {
                    Heartland.DOM.resizeFrame(hps);
                };
            }(this));
            this.receiveMessageHandlerAddedHandler = (function (hps) {
                return function () {
                    hps.Messages.post({ action: 'receiveMessageHandlerAdded' }, 'parent');
                };
            }(this));
            Heartland.Events.addHandler(window, 'load', this.loadHandler);
            Heartland.Events.addHandler(document, 'receiveMessageHandlerAdded', this.receiveMessageHandlerAddedHandler);
            this.Messages.receive(Heartland.Events.frameHandleWith(this), '*');
        };
        ;
        /**
         * Heartland.HPS.configureButtonFieldIframe
         *
         * Same as `Heartland.HPS.configureFieldIframe` excet the added click event
         * handler for the button.
         *
         * @param {Heartland.Options} options
         */
        HPS.prototype.configureButtonFieldIframe = function (options) {
            this.configureFieldIframe(options);
            Heartland.Events.addHandler('heartland-field', 'click', (function (hps) {
                return function (e) {
                    e.preventDefault ? e.preventDefault() : (e.returnValue = false);
                    hps.Messages.post({ action: 'requestTokenize' }, 'parent');
                };
            }(this)));
        };
        /**
         * Heartland.HPS.configureFieldIframe
         *
         * Sets up a child iframe window to prepare it for communication with the
         * parent and for tokenization.
         *
         * @param {Heartland.Options} options
         */
        HPS.prototype.configureFieldIframe = function (options) {
            var hash = document.location.hash.replace(/^#/, '');
            var split = hash.split(':');
            this.Messages = new Heartland.Messages(this);
            this.field = split.shift();
            this.parent = window.parent;
            this.frames = this.frames || {};
            this.frames.parent = {
                frame: window.parent,
                name: 'parent',
                url: decodeURIComponent(split.join(':').replace(/^:/, ''))
            };
            window.onerror = (function (hps) {
                return function (errorMsg, url, lineNumber, column, errorObj) {
                    hps.Messages.post({
                        action: 'error',
                        data: {
                            column: column,
                            errorMsg: errorMsg,
                            lineNumber: lineNumber,
                            url: url
                        }
                    }, 'parent');
                    return true;
                };
            }(this));
            this.loadHandler = (function (hps) {
                return function () {
                    Heartland.DOM.resizeFrame(hps);
                    Heartland.DOM.configureField(hps);
                    var method = 'attach' + window.name.replace('card', '') + 'Events';
                    if (Heartland.Card[method]) {
                        Heartland.Card[method]('#heartland-field');
                    }
                };
            }(this));
            this.receiveMessageHandlerAddedHandler = (function (hps) {
                return function () {
                    hps.Messages.post({ action: 'receiveMessageHandlerAdded' }, 'parent');
                };
            }(this));
            Heartland.Events.addHandler(window, 'load', this.loadHandler);
            Heartland.Events.addHandler(document, 'receiveMessageHandlerAdded', this.receiveMessageHandlerAddedHandler);
            Heartland.Frames.monitorFieldEvents(this, 'heartland-field');
            this.Messages.receive(Heartland.Events.frameHandleWith(this), '*');
        };
        ;
        /**
         * Heartland.HPS.resizeIFrame
         *
         * Called automatically when the child iframe window alerts the parent to
         * resize.
         *
         * @param {HTMLIFrameElement} frame
         * @param {string} height
         */
        HPS.prototype.resizeIFrame = function (frame, height) {
            if (!frame) {
                return;
            }
            frame.style.height = (parseInt(height, 10)) + 'px';
        };
        ;
        /**
         * Heartland.HPS.setText
         *
         * Public API for setting an element's inner text.
         *
         * @param {string} elementid
         * @param {string} elementtext
         */
        HPS.prototype.setText = function (elementid, elementtext) {
            this.Messages.post({ action: 'setText', id: elementid, text: elementtext }, 'child');
        };
        ;
        /**
         * Heartland.HPS.setStyle
         *
         * Public API for setting an element's style.
         *
         * @param {string} elementid
         * @param {string} elementstyle
         */
        HPS.prototype.setStyle = function (elementid, elementstyle) {
            this.Messages.post({ action: 'setStyle', id: elementid, style: elementstyle }, 'child');
        };
        ;
        /**
         * Heartland.HPS.appendStyle
         *
         * Public API for appending to an element's style.
         *
         * @param {string} elementid
         * @param {string} elementstyle
         */
        HPS.prototype.appendStyle = function (elementid, elementstyle) {
            this.Messages.post({ action: 'appendStyle', id: elementid, style: elementstyle }, 'child');
        };
        ;
        /**
         * Heartland.HPS.setFocus
         *
         * Public API for appending to an element's style.
         *
         * @param {string} elementid
         */
        HPS.prototype.setFocus = function (elementid) {
            this.Messages.post({ action: 'setFocus' }, elementid);
        };
        ;
        /**
         * Heartland.HPS.dispose
         *
         * Removes all iframes and event listeners from the DOM.
         */
        HPS.prototype.dispose = function () {
            this.Messages.dispose();
            this.Messages = null;
            if (this.frames.cardNumber && this.frames.cardNumber.targetNode) {
                this.frames.cardNumber.frame.remove();
            }
            if (this.frames.cardExpiration && this.frames.cardExpiration.frame) {
                this.frames.cardExpiration.frame.remove();
            }
            if (this.frames.cardCvv && this.frames.cardCvv.frame) {
                this.frames.cardCvv.frame.remove();
            }
            if (this.frames.child && this.frames.child.frame) {
                this.frames.child.frame.remove();
            }
            if (this.clickHandler) {
                Heartland.Events.removeHandler(this.options.buttonTarget, 'click', this.clickHandler);
            }
            if (this.loadHandler) {
                Heartland.Events.removeHandler(window, 'load', this.loadHandler);
            }
            if (this.receiveMessageHandlerAddedHandler) {
                Heartland.Events.removeHandler(document, 'receiveMessageHandlerAdded', this.receiveMessageHandlerAddedHandler);
            }
        };
        ;
        return HPS;
    }());
})(Heartland || (Heartland = {}));

exports.HPS = HPS;

Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=securesubmit.js.map
