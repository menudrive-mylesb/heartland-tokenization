import { DOM } from "./DOM";
import { HPS } from "./HPS";
import { CardData } from "./types/CardData";
import { Options } from "./types/Options";
import { TokenizationResponse } from "./types/TokenizationResponse";
import { Expiration as ExpirationFormatter } from "./formatter/Expiration";
import { JSON2 } from "./vendor/json2";

class Ev {
  public static listen(node: EventTarget, eventName: string, callback: EventListener) {
    if (document.addEventListener) {
      node.addEventListener(eventName, callback, false);
    } else {
      if (node === document) {
        (<any>document.documentElement).attachEvent('onpropertychange', function(e: Event) {
          if ((<any>e).propertyName === eventName) {
            callback(e);
          }
        });
      } else {
        (<any>node).attachEvent('on' + eventName, callback);
      }
    }
  }
  public static trigger(node: EventTarget, eventName: string) {
    if (document.createEvent) {
      const event = document.createEvent('Event');
      event.initEvent(eventName, true, true);
      node.dispatchEvent(event);
    } else {
      (<any>document.documentElement)[eventName]++;
    }
  }
  public static ignore(eventName: string, callback: EventListener) {
    if (document.removeEventListener) {
      document.removeEventListener(eventName, callback, false);
    } else {
      (<any>document.documentElement).detachEvent('onpropertychange', function(e: Event) {
        if ((<any>e).propertyName === eventName) {
          callback(e);
        }
      });
    }
  }
}

/**
 * @namespace Heartland.Events
 */
export class Events {
  /**
   * Heartland.Events.addHandler
   *
   * Adds an `event` handler for a given `target` element.
   *
   * @param {string | EventTarget} target
   * @param {string} event
   * @param {EventListener} callback
   */
  public static addHandler(target: string | EventTarget, event: string, callback: EventListener) {
    let node: EventTarget;
    if (typeof target === 'string') {
      node = document.getElementById(<string>target);
    } else {
      node = target;
    }

    if (document.addEventListener) {
      node.addEventListener(event, callback, false);
    } else {
      Ev.listen(node, event, callback);
    }
  }

  /**
   * Heartland.Events.removeHandler
   *
   * Removes an `event` handler for a given `target` element.
   *
   * @param {string | EventTarget} target
   * @param {string} event
   * @param {EventListener} callback
   */
  public static removeHandler(target: string | EventTarget, event: string, callback: EventListener) {
    let node: EventTarget;
    if (typeof target === 'string') {
      node = document.getElementById(<string>target);
    } else {
      node = target;
    }

    if (document.removeEventListener) {
      node.removeEventListener(event, callback, false);
    } else {
      Ev.ignore(event, callback);
    }
  }

  /**
   * Heartland.Events.trigger
   *
   * Fires off an `event` for a given `target` element.
   *
   * @param {string} name
   * @param {any} target
   * @param {any} data [optional]
   */
  public static trigger(name: string, target: any, data?: any, bubble = false) {
    if (document.createEvent) {
      const event = document.createEvent('Event');
      event.initEvent(name, true, true);
      target.dispatchEvent(event);
    } else {
      Ev.trigger(target, name);
    }
  }

  /**
   * Heartland.Events.frameHandleWith
   *
   * Wraps `hps` state in a closure to provide a `Heartland.Messages.receive`
   * callback handler for iFrame children.
   *
   * @param {Heartland.HPS} hps
   */
  public static frameHandleWith(hps: HPS): (m: any) => void {
    return function(data) {
      switch (data.action) {
        case 'tokenize':
          if (data.accumulateData) {
            hps.Messages.post(
              {
                action: 'accumulateData'
              },
              'parent'
            );

            let elOpts = (<HTMLInputElement>document.getElementById('tokenizeOptions'));
            if (!elOpts) {
              elOpts = document.createElement('input');
              elOpts.id = 'tokenizeOptions';
              elOpts.type = 'hidden';
            }

            let elPK = (<HTMLInputElement>document.getElementById('publicKey'));
            if (!elPK) {
              elPK = document.createElement('input');
              elPK.id = 'publicKey';
              elPK.type = 'hidden';
            }

            if (data.data) {
              elOpts.value = JSON2.stringify(data.data);
              elPK.value = data.data.publicKey;
            } else {
              elOpts.value = JSON2.stringify({publicKey: data.message});
              elPK.value = data.message;
            }

            document
              .getElementById('heartland-field-wrapper')
              .appendChild(elOpts);
            document
              .getElementById('heartland-field-wrapper')
              .appendChild(elPK);
          } else {
            Events.tokenizeIframe(hps, data.data);
          }
          break;
        case 'setStyle':
          DOM.setStyle(data.id, data.style);
          DOM.resizeFrame(hps);
          break;
        case 'appendStyle':
          DOM.appendStyle(data.id, data.style);
          DOM.resizeFrame(hps);
          break;
        case 'setText':
          DOM.setText(data.id, data.text);
          DOM.resizeFrame(hps);
          break;
        case 'setValue':
          DOM.setValue(data.id, data.text);
          break;
        case 'setPlaceholder':
          DOM.setPlaceholder(data.id, data.text);
          break;
        case 'setFieldData':
          DOM.setFieldData(data.id, data.value);
          if (document.getElementById('heartland-field') &&
            document.getElementById('cardCvv') &&
            document.getElementById('cardExpiration')) {
            const opts = document.getElementById('tokenizeOptions');
            const pk = document.getElementById('publicKey');
            Events.tokenizeIframe(hps,
              (opts && opts.getAttribute('value') !== 'undefined'
              ? JSON2.parse(opts.getAttribute('value'))
              : { publicKey: pk.getAttribute('value') })
            );
          }
          break;
        case 'getFieldData':
          DOM.getFieldData(hps, data.id);
          break;
        case 'addStylesheet':
          DOM.addStylesheet(data.data);
          DOM.resizeFrame(hps);
          break;
        case 'setFocus':
          DOM.setFocus();
          break;
      }
    };
  }

  /**
   * tokenizeIframe
   *
   * Tokenizes card data. Used in iframe integrations to tokenize on Heartland's
   * servers.
   *
   * @param {Heartland.HPS} hps
   * @param {string} publicKey
   */
  public static tokenizeIframe(hps: HPS, data: Options) {
    const card: CardData = {};
    const numberElement = <HTMLInputElement>(document.getElementById('heartland-field')
      || document.getElementById('heartland-card-number'));
    const cvvElement = <HTMLInputElement>(document.getElementById('cardCvv')
      || document.getElementById('heartland-cvv'));
    const expElement = document.getElementById('cardExpiration');
    const tokenResponse = (action: string) => {
      return (response: TokenizationResponse) => {
        hps.Messages.post({ action: action, response: response }, 'parent');
        if (cvvElement) {
          if (cvvElement.parentNode) {
            cvvElement.parentNode.removeChild(cvvElement);
          } else {
            cvvElement.remove();
          }
        }
        if (expElement) {
          if (expElement.parentNode) {
            expElement.parentNode.removeChild(expElement);
          } else {
            expElement.remove();
          }
        }
      };
    };

    card.number = numberElement ? numberElement.value : '';
    card.cvv = cvvElement ? cvvElement.value : '';
    card.exp = expElement;

    if (card.exp) {
      const formatter = new ExpirationFormatter();
      const cardExpSplit = formatter.format((<HTMLInputElement>card.exp).value, true).split('/');
      card.expMonth = cardExpSplit[0];
      card.expYear = cardExpSplit[1];
      card.exp = undefined;
    } else {
      card.expMonth = (<HTMLInputElement>document.getElementById('heartland-expiration-month')).value;
      card.expYear = (<HTMLInputElement>document.getElementById('heartland-expiration-year')).value;
    }

    hps.tokenize({
      cardCvv: card.cvv ? card.cvv : '',
      cardExpMonth: card.expMonth ? card.expMonth : '',
      cardExpYear: card.expYear ? card.expYear : '',
      cardNumber: card.number ? card.number : '',
      cca: data.cca,
      error: tokenResponse('onTokenError'),
      publicKey: data.publicKey ? data.publicKey : '',
      success: tokenResponse('onTokenSuccess'),
      type: 'pan'
    });
  }

  /**
   * addFieldFrameFocusEvent
   *
   * Ensures an iframe's document forwards its received focus
   * to the input field. Helps provide consistent behavior in
   * all browsers.
   *
   * @param {Heartland.HPS} hps
   */
  public static addFieldFrameFocusEvent(hps: HPS) {
    var element = document.getElementById('heartland-field');
    var focusEventName = 'focus';
    if ((document as any)['on' + focusEventName + 'in']) {
      document.addEventListener(focusEventName + 'in', function (e) {
        if ((event as any).fromElement === element) { return; }
        if ((event as any).relatedTarget) { return; }

        element.focus();
      }, false);
    } else {
      document.addEventListener(focusEventName, function (e) {
        element.focus();
      }, false);
    }
  }
}
