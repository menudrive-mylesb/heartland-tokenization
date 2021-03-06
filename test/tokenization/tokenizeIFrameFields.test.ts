import {assert} from "chai";
import Heartland from "../../src";
import {HeartlandTest} from "../util/helpers";

suite('tokenize iframe fields', function () {
  test('valid iframe fields setup', function (done) {
    const numberId = 'valid-cardNumber-target';
    const dateId = 'valid-cardExpiration-target';
    const cvvId = 'valid-cardCvv-target';
    HeartlandTest.makeDiv(numberId);
    HeartlandTest.makeDiv(dateId);
    HeartlandTest.makeDiv(cvvId);

    const timeout = setTimeout(function () {
      assert.ok(false, 'iframe failed to construct properly');
      done();
    }, 4000);
    const cleanup = function () {
      const numEl = document.getElementById(numberId);
      numEl.parentNode.removeChild(numEl);
      const dateEl = document.getElementById(dateId);
      dateEl.parentNode.removeChild(dateEl);
      const cvvEl = document.getElementById(cvvId);
      cvvEl.parentNode.removeChild(cvvEl);
      clearTimeout(timeout);
    };

    const hps = new Heartland.HPS({
      publicKey: HeartlandTest.public_key,
      type: 'iframe',
      fields: {
        cardNumber: {
          target: numberId,
          placeholder: 'Card Number'
        },
        cardCvv: {
          target: cvvId,
          placeholder: 'Security Code'
        },
        cardExpiration: {
          target: dateId,
          placeholder: 'MM / YYYY'
        }
      },
      onTokenSuccess: HeartlandTest.check_for_token(assert, done, cleanup),
      onTokenError: HeartlandTest.default_error(assert, done, cleanup)
    });

    let readyCount = 0;
    HeartlandTest.addHandler(document, 'securesubmitIframeReady', function () {
      if (++readyCount === 3) {
        HeartlandTest.setCardData(hps);
        hps.tokenize();
      }
    });
  });
});
