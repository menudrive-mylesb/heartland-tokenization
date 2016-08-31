import {HPS} from "./HPS";

/**
 * @namespace Heartland.DOM
 */
export class DOM {
  /**
   * Heartland.DOM.configureField
   *
   * Configures an input field in a single field iFrame.
   *
   * @param {Heartland.HPS} hps
   */
  public static configureField(hps: HPS) {
    document.getElementById('heartland-field').setAttribute('name', hps.field);
  }

  /**
   * Heartland.DOM.makeFrame
   *
   * Creates a single iFrame element with the appropriate defaults.
   *
   * @param {string} name
   * @returns {HTMLIframeElement}
   */
  public static makeFrame(name: string) {
    var frame = document.createElement('iframe');
    frame.id = 'heartland-frame-' + name;
    frame.name = name;
    frame.style.border = '0';
    frame.frameBorder = '0';
    frame.scrolling = 'no';
    return frame;
  }

  /**
   * Heartland.DOM.addField
   *
   * Adds a DOM `input` node to `formParent` with type `fieldType`, name
   * `fieldName`, and value `fieldValue`.
   *
   * @param {string} formParent
   * @param {string} fieldType
   * @param {string} fieldName
   * @param {string} fieldValue
   */
  public static addField(formParent: string, fieldType: string, fieldName: string, fieldValue: string) {
    var input = document.createElement('input');

    input.setAttribute('type', fieldType);
    input.setAttribute('name', fieldName);
    input.setAttribute('value', fieldValue);

    document.getElementById(formParent).appendChild(input);
  }

  /**
   * Heartland.DOM.setStyle
   *
   * Sets an element's style attribute within a child iframe window.
   *
   * @param {string} elementid
   * @param {string} htmlstyle
   */
  public static setStyle(elementid: string, htmlstyle: string) {
    var el = document.getElementById(elementid);
    if (el) {
      el.setAttribute('style', this.encodeEntities(htmlstyle));
    }
  }

  /**
   * Heartland.DOM.appendStyle
   *
   * Appends an element's style attribute within a child iframe window.
   *
   * @param {string} elementid
   * @param {String} htmlstyle
   */
  public static appendStyle(elementid: string, htmlstyle: string) {
    var el = document.getElementById(elementid);
    if (el) {
      var currstyle = el.getAttribute('style');
      var newstyle = (currstyle ? currstyle : '') + htmlstyle;
      el.setAttribute('style', this.encodeEntities(newstyle));
    }
  }

  /**
   * Heartland.DOM.setText
   *
   * Sets an element's inner text within a child iframe window.
   *
   * @param {string} elementid
   * @param {string} text
   */
  public static setText(elementid: string, text: string) {
    var el = document.getElementById(elementid);
    if (el) {
      el.textContent = this.encodeEntities(text);
    }
  }

  /**
   * Heartland.DOM.setPlaceholder
   *
   * Sets an element's placeholder attribute within a child iframe window.
   *
   * @param {string} elementid
   * @param {string} text
   */
  public static setPlaceholder(elementid: string, text: string) {
    var el = document.getElementById(elementid);
    if (el) {
      if (text === '•••• •••• •••• ••••' || text === '••••' || text === '•••'
        || text === '···· ···· ···· ····') {
        el.setAttribute('placeholder', text);
      } else {
        el.setAttribute('placeholder', this.encodeEntities(text));
      }
    }
  }

  /**
   * Heartland.DOM.resizeFrame
   *
   * Alerts a parent window to resize the iframe.
   *
   * @param {Heartland.HPS} hps
   */
  public static resizeFrame(hps: HPS) {
    var docHeight = document.body.offsetHeight + 1; // off by one error
    hps.Messages.post({ action: 'resize', height: docHeight }, 'parent');
  }

  /**
   * Heartland.DOM.setFieldData
   *
   * Receives a field value from another frame prior to the tokenization process.
   *
   * @param {string} elementid
   * @param {string} value
   */
  public static setFieldData(elementid: string, value: string) {
    var el = document.getElementById(elementid);
    if (!el && document.getElementById('heartland-field')) {
      el = document.createElement('input');
      el.setAttribute('id', this.encodeEntities(elementid));
      el.setAttribute('type', 'hidden');
      document.getElementById('heartland-field-wrapper').appendChild(el);
    }

    if (el) {
      el.setAttribute('value', this.encodeEntities(value));
    }
  }

  /**
   * Heartland.DOM.getFieldData
   *
   * Retrieves a field value for another frame prior to the tokenization process.
   *
   * @param {Heartland.HPS} hps
   * @param {string} elementid
   */
  public static getFieldData(hps: HPS, elementid: string) {
    var el: HTMLInputElement = <HTMLInputElement>document.getElementById(elementid);
    if (el) {
      hps.Messages.post({ action: 'passData', value: el.value }, 'parent');
    }
  }

  /**
   * Heartland.DOM.addStylesheet
   *
   * Creates a `style` node in the DOM with the given `css`.
   *
   * @param {Heartland.HPS} hps
   * @param {string} elementid
   */
  public static addStylesheet(css: string) {
    var el = document.createElement('style');
    var elements = document.getElementsByTagName('head');
    el.type = 'text/css';
    el.appendChild(document.createTextNode(css));
    if (elements && elements[0]) {
      elements[0].appendChild(el);
    }
  }

  /**
   * Heartland.DOM.json2css
   *
   * Converts a JSON node to text representing CSS.
   *
   * @param {string} json
   * @returns {string}
   */
  public static json2css(json: Object): string {
    var css = '';
    var attributes: string[];
    var children: Object[];
    var i: number, j: number;
    var key: any, value: any;

    if (attributes = this.jsonAttributes(json)) {
      var attributesLength = attributes.length;
      for (i = 0; i < attributesLength; i++) {
        key = attributes[i];
        value = (<any>json)[key];
        if (this.isArray(value)) {
          var arrLength = value.length;
          for (j = 0; j < arrLength; j++) {
            css += key + ':' + value[j] + ';';
          }
        } else {
          css += key + ':' + value + ';';
        }
      }
    }

    if (children = this.jsonChildren(json)) {
      var childrenLength = children.length;
      for (i = 0; i < childrenLength; i++) {
        key = children[i];
        value = (<any>json)[key];
        css += key + '{' + this.json2css(value) + '}';
      }
    }

    return css;
  }

  /**
   * Heartland.DOM.setFocus
   *
   * Sets the focus on an iframe's field.
   *
   * @param {Heartland.HPS} hps
   * @param {string} elementid
   */
  public static setFocus() {
    var el = document.getElementById('heartland-field');
    if (el) {
      el.focus();
    }
  }

  /***********
   * Helpers *
   ***********/

  /**
   * Escapes all potentially dangerous characters, so that the
   * resulting string can be safely inserted into attribute or
   * element text.
   *
   * @param value
   * @returns {string} escaped text
   */
  private static encodeEntities(value: string) {
    return value.
      replace(/&/g, '&amp;').
      replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, function (v) {
        var hi = v.charCodeAt(0);
        var low = v.charCodeAt(1);
        return '&#' + (((hi - 0xD800) * 0x400) + (low - 0xDC00) + 0x10000) + ';';
      }).
      replace(/([^\#-~| |!])/g, function (v) {
        return '&#' + v.charCodeAt(0) + ';';
      }).
      replace(/</g, '&lt;').
      replace(/>/g, '&gt;');
  }

  private static isArray(obj: any): boolean {
    return Object.prototype.toString.call(obj) === '[object Array]';
  }

  private static jsonAttributes(json: Object): string[] {
    var set: string[] = [];
    var i: string;
    for (i in json) {
      if (json.hasOwnProperty(i)
        && (typeof (<any>json)[i] === 'string' || this.isArray((<any>json)[i]))) {
        set.push(i);
      }
    }
    return set;
  }

  private static jsonChildren(json: Object): Object[] {
    var set: Object[] = [];
    var i: string;
    for (i in json) {
      if (json.hasOwnProperty(i)
        && (Object.prototype.toString.call((<any>json)[i]) === '[object Object]')) {
        set.push(i);
      }
    }
    return set;
  }
}
