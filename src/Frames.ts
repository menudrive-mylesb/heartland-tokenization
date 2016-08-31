import {defaults} from "./vars/defaults";
import {fields} from "./vars/fields";
import {urls} from "./vars/urls";
import {DOM} from "./DOM";
import {Events} from "./Events";
import {HPS} from "./HPS";
import {Messages} from "./Messages";
import {Styles} from "./Styles";

/**
 * @namespace Heartland.Frames
 */
export class Frames {
  /**
   * Heartland.Frames.configureIframe
   *
   * Prepares the pages iFrames for communication with the parent window.
   *
   * @param {Heartland.HPS} hps
   * @listens click
   * @listens message
   */
  public static configureIframe(hps: HPS) {
    var frame: any;
    var options = hps.options;
    var target: HTMLElement;
    var useDefaultStyles = true;
    hps.Messages = hps.Messages || new Messages(hps);

    if (options.env === 'cert') {
      hps.iframe_url = urls.iframeCERT;
    } else {
      hps.iframe_url = urls.iframePROD;
    }

    if (options.fields !== defaults.fields) {
      Frames.makeFieldsAndLink(hps);
    }

    if (options.fields === defaults.fields && options.iframeTarget) {
      target = document.getElementById(options.iframeTarget);
      if (options.targetType === 'myframe') {
        frame = target;
        hps.iframe_url = frame.src;
      } else {
        frame = DOM.makeFrame('heartland-frame-securesubmit');
        target.appendChild(frame);
      }

      hps.iframe_url = hps.iframe_url + '#' + encodeURIComponent(document.location.href.split('#')[0]);
      frame.src = hps.iframe_url;

      hps.frames.child = {
        frame: window.postMessage ? frame.contentWindow : frame,
        name: 'child',
        url: hps.iframe_url
      };
    }

    if (options.useDefaultStyles === false) {
      useDefaultStyles = false;
    }

    if (options.buttonTarget) {
      hps.clickHandler = function (e) {
        e.preventDefault();
        hps.Messages.post(
          {
            accumulateData: !!hps.frames.cardNumber,
            action: 'tokenize',
            message: options.publicKey
          },
          hps.frames.cardNumber ? 'cardNumber' : 'child'
        );
        return false;
      };
      Events.addHandler(options.buttonTarget, 'click', hps.clickHandler);
    }

    hps.Messages.receive(function (m: MessageEvent) {
      var data = JSON.parse(m.data);
      var fieldFrame: any;

      try {
        fieldFrame = (<any>hps.frames)[data.source.name === 'heartland-frame-securesubmit' ? 'parent' : data.source.name];
      } catch (e) { return; }

      switch (data.action) {
        case 'requestTokenize':
          hps.Messages.post(
            {
              accumulateData: !!hps.frames.cardNumber,
              action: 'tokenize',
              message: options.publicKey
            },
            hps.frames.cardNumber ? 'cardNumber' : 'child'
          );
          break;
        case 'onTokenSuccess':
          options.onTokenSuccess(data.response);
          break;
        case 'onTokenError':
          options.onTokenError(data.response);
          break;
        case 'resize':
          if (fieldFrame) {
            hps.resizeIFrame(fieldFrame.frame, data.height);
          } else {
            hps.resizeIFrame(frame, data.height);
          }

          break;
        case 'receiveMessageHandlerAdded':
          if (!options.fields && useDefaultStyles) {
            Styles.Defaults.body(hps);
            Styles.Defaults.labelsAndLegend(hps);
            Styles.Defaults.inputsAndSelects(hps);
            Styles.Defaults.fieldset(hps);
            Styles.Defaults.selects(hps);
            Styles.Defaults.selectLabels(hps);
            Styles.Defaults.cvvContainer(hps);
            Styles.Defaults.cvv(hps);
          }

          if (fieldFrame && fieldFrame.options.placeholder) {
            hps.Messages.post(
              {
                action: 'setPlaceholder',
                id: 'heartland-field',
                text: fieldFrame.options.placeholder
              },
              fieldFrame.name
            );
          }

          if (options.style) {
            var css = options.styleString
              || (options.styleString = DOM.json2css(options.style));
            hps.Messages.post(
              {
                action: 'addStylesheet',
                data: css
              },
              fieldFrame.name
            );
          }

          Events.trigger('securesubmitIframeReady', document);
          break;
        case 'accumulateData':
          var i: string;
          var field: any;

          for (i in hps.frames) {
            if ('submit' === i || 'cardNumber' === i) {
              continue;
            }
            field = (<any>hps.frames)[i];
            hps.Messages.post(
              {
                action: 'getFieldData',
                id: 'heartland-field'
              },
              field.name
            );
          }
          break;
        case 'passData':
          var cardNumberFieldFrame = hps.frames.cardNumber;
          if (!cardNumberFieldFrame) {
            break;
          }

          hps.Messages.post(
            {
              action: 'setFieldData',
              id: fieldFrame.name,
              value: data.value
            },
            cardNumberFieldFrame.name
          );
          break;
        case 'fieldEvent':
          if (!options.onEvent) {
            break;
          }
          options.onEvent(data.event);
          break;
        case 'error':
          if (!options.onError) {
            break;
          }
          options.onError(data);
          break;
      }
    }, '*');


    // monitorFieldEvents(hps, )
  }

  /**
   * Heartland.Frames.makeFieldsAndLink
   *
   * Creates a set of single field iFrames and stores a reference to
   * them in the parent window's state.
   *
   * @param {Heartland.HPS} hps
   */
  public static makeFieldsAndLink(hps: HPS) {
    var options = hps.options;
    var fieldsLength = fields.length;
    var baseUrl = hps.iframe_url.replace('index.html', '');

    for (var i = 0; i < fieldsLength; i++) {
      var field = fields[i];
      var fieldOptions = options.fields[field];

      if (!fieldOptions) { return; }

      var frame = DOM.makeFrame(field);
      var url = baseUrl;
      if (field === 'submit') {
        url = url + 'button.html';
      } else {
        url = url + 'field.html';
      }
      url = url + '#' + field + ':' + encodeURIComponent(document.location.href.split('#')[0]);
      frame.src = url;

      document
        .getElementById(fieldOptions.target)
        .appendChild(frame);

      (<any>hps.frames)[field] = {
        frame: frame,
        name: field,
        options: fieldOptions,
        target: fieldOptions.target,
        targetNode: window.postMessage ? frame.contentWindow : frame,
        url: url
      };
    }
  }

  /**
   * Heartland.Frames.monitorFieldEvents
   *
   * @param {Heartland.HPS} hps
   * @param {string | EventTarget} target
   */
  public static monitorFieldEvents(hps: HPS, target: string | EventTarget) {
    var events = ['click', 'blur', 'focus', 'change', 'keypress', 'keydown', 'keyup'];
    var i = 0, length = events.length;
    var event: string;

    for (i; i < length; i++) {
      event = events[i];
      Events.addHandler(target, event, function (e: Event) {
        var field = document.getElementById('heartland-field');
        var classes: string[] = [];
        var data: any = {};

        if (field.className !== '') {
          classes = field.className.split(' ');
        }

        if ((<any>e).keyCode) {
          data.keyCode = (<any>e).keyCode;
        }

        hps.Messages.post(
          {
            action: 'fieldEvent',
            event: {
              classes: classes,
              data: data,
              source: window.name,
              type: e.type
            }
          },
          'parent'
        );
      });
    }
  }
}
