/*! https://github.com/robiveli/jpopup */
!function(e,n){void 0===e&&void 0!==window&&(e=window),"function"==typeof define&&define.amd?define([],function(){return e.jPopup=n()}):"object"==typeof module&&module.exports?module.exports=n():e.jPopup=n()}(this,function(){"use strict";var n,o,t=function(){var e=0<arguments.length&&void 0!==arguments[0]?arguments[0]:"";1==(n=0!=e.shouldSetHash)&&(o=void 0!==e.hashtagValue?e.hashtagValue:"#popup"),i(e.content).then(a).then(1==n&&s(!0))},i=function(e){return u.classList.add("jPopupOpen"),Promise.resolve(document.body.insertAdjacentHTML("beforeend",'<div class="jPopup">\n                <button type="button" class="jCloseBtn">\n                    <div class="graphicIcon"></div>\n                </button>\n                <div class="content">'.concat(e,"</div>\n            </div>")))},s=function(e){1==e?window.location.hash=o:window.history.back()},d=function(e){27==e.keyCode&&t.prototype.close(!0)},c=function(){window.location.hash!==o&&t.prototype.close(!1)},a=function(){document.getElementsByClassName("jCloseBtn")[0].addEventListener("click",function(){t.prototype.close(!0)}),window.addEventListener("keydown",d),1==n&&window.addEventListener("hashchange",c)},u=document.querySelector("html");return t.prototype={close:function(e){u.classList.add("jPopupClosed"),1==n&&(e&&s(!1),window.removeEventListener("hashchange",c)),window.removeEventListener("keydown",d),document.getElementsByClassName("jPopup")[0].addEventListener("animationend",function(e){e.target.parentNode.removeChild(this),u.classList.remove("jPopupClosed"),u.classList.remove("jPopupOpen")})},open:function(e){t(e)}},t});

LnTip = function (options) {
  var host = document.getElementById('lntip-script').getAttribute('lntip-host');
  this.host = options.host || host;
  this.amount = options.amount;
  this.memo = options.memo || '';
  this.loadStylesheet();
  this.getInvoice();
}

LnTip.prototype.loadStylesheet = function () {
  if (document.getElementById('lntip-style')) { return; }
  // get the CSS file from the same source as the JS widget file
  var script = document.getElementById('lntip-script');
  var source = script.src.replace(/\.js$/, ".css");
  var head = document.getElementsByTagName('head')[0];
  var css = document.createElement('link');
  css.id = "lntip-style";
  css.rel = "stylesheet";
  css.type = "text/css";
  css.href = source
  head.appendChild(css);
}

LnTip.prototype.closePopup = function () {
  if (this.popup) {
    this.popup.close();
    this.popup = null;
  }
}

LnTip.prototype.openPopup = function (content) {
  this.closePopup();
  this.popup = new jPopup({
    content: content,
    shouldSetHash: false
  });
  return this.popup;
}

LnTip.prototype.thanks = function () {
  var content = '<div class="lntip-payment-request"><h1 class="lntip-headline">Thank you!</h1></div>';
  this.openPopup(content);
  setTimeout(() => {
    this.closePopup();
  }, 3000);
}

LnTip.prototype.watchPayment = function () {
  if (this.paymentWatcher) { window.clearInterval(this.paymentWatcher) }
  this.paymentWatcher = window.setInterval(() => {
    this._request(`${this.host}/settled/${this.invoice.ImplDepID}`)
      .then((settled) => {
        if (settled) {
          this.invoice.settled = true;
          this.thanks();
          this.stopWatchingPayment();
        }
      })
  }, 2000);
}

LnTip.prototype.stopWatchingPayment = function () {
  window.clearInterval(this.paymentWatcher);
  this.paymentWatcher = null;
}

LnTip.prototype.payWithWebln = function () {
  if (!webln.isEnabled) {
	  webln.enable().then((weblnResponse) => {
      return webln.sendPayment({ paymentRequest: this.invoice.PaymentRequest })
    }).catch((e) => {
      this.requestPayment();
    })
  } else {
    return webln.sendPayment({ paymentRequest: this.invoice.PaymentRequest })
  }
}

LnTip.prototype.requestPayment = function () {
  var content = `<div class="lntip-payment-request">
    <h1>${this.memo}</h1>
    <h2>${this.amount} satoshi</h2>
    <div class="lntip-qr">
      <img src="https://chart.googleapis.com/chart?cht=qr&chs=200x200&chl=${this.invoice.PaymentRequest}">
    </div>
    <div class="lntip-details">
      <a href="lightning:${this.invoice.PaymentRequest}" class="lntip-invoice">
        ${this.invoice.PaymentRequest}
      </a>
      <div class="lntip-copy" id="lntip-copy">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-copy"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
      </div>
    </div>
  </div>`
  this.openPopup(content);

  document.getElementById('lntip-copy').onclick = () => {
    navigator.clipboard.writeText(this.invoice.PaymentRequest);
    alert('Copied to clipboad');
  }
  return Promise.resolve();
}

LnTip.prototype.getInvoice = function () {
  var args = {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ memo: this.memo, amount: this.amount })
  };
  return this._request(
      `${this.host}/invoice`,
      args
    ).then((invoice) => {
      this.invoice = invoice;
      this.watchPayment();

      if (typeof webln !== 'undefined') {
        this.payWithWebln();
      } else {
        this.requestPayment();
      }
    })
}

LnTip.prototype._request = function(url, args) {
  return fetch(url, args).then((response) => {
    return response.json();
  })
}