import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const legal=readFileSync(new URL('../tokusho.html',import.meta.url),'utf8');
const contact=readFileSync(new URL('../contact.html',import.meta.url),'utf8');
const plans=readFileSync(new URL('../plans.html',import.meta.url),'utf8');
const workerMode=readFileSync(new URL('../worker/billing-mode.js',import.meta.url),'utf8');

const mailto=(html,id)=>{
 const match=html.match(new RegExp('<a\\b(?=[^>]*\\bid="'+id+'")[^>]*\\bhref="([^"]+)"','i'));
 assert.ok(match,'A working mailto link is required: '+id);
 const url=new URL(match[1].replaceAll('&amp;','&'));
 assert.equal(url.protocol,'mailto:');
 assert.equal(url.pathname,'odentabetaina.oden@gmail.com');
 assert.match(url.searchParams.get('subject')||'',/特定商取引法.*開示請求/);
 return url;
};

test('individual business legal notice offers request-based disclosure without leaking operator identity',()=>{
 assert.match(legal,/特定商取引法に基づく表記/);
 assert.match(legal,/<meta name="robots" content="noindex,nofollow">/);
 assert.match(legal,/販売開始前の草案です/);
 assert.match(legal,/事業者の氏名・住所・電話番号の開示/);
 assert.match(legal,/申込みを判断する前に十分な時間的余裕/);
 assert.match(legal,/遅滞なく提供/);
 assert.match(legal,/購入・Googleログイン・支払いは不要/);
 assert.match(legal,/正式販売は開始しません/);
 assert.doesNotMatch(legal,/<address\\b|〒[0-9]{3}|(?:TEL|電話番号)[:：]\\s*[0-9]{2,}/i);
 assert.doesNotMatch(legal,/id="sg-checkout"/);
 mailto(legal,'sg-operator-disclosure-request');
});

test('contact page has a private request link and does not send claimants to public Issues',()=>{
 const fromContact=mailto(contact,'sg-disclosure-mail');
 const fromLegal=mailto(legal,'sg-operator-disclosure-request');
 assert.equal(fromContact.href,fromLegal.href);
 assert.match(contact,/メールの送信は自動では行われません/);
 assert.match(contact,/購入・Googleログイン・決済は不要/);
 assert.match(contact,/返信を受け取るメールアドレス以外の住所、電話番号、認証情報は送らない/);
 assert.match(contact,/実際の受付・返信体制が整うまでは有料販売を開始しません/);
 assert.match(contact,/GitHubのIssueは公開されます/);
 assert.ok(contact.includes('href="./tokusho.html"'));
});

test('price page links legal disclosure but unverified content cannot authorize Live charges',()=>{
 assert.ok(plans.includes('href="./tokusho.html"'));
 assert.ok(workerMode.includes("env.LIVE_LEGAL_READY==='verified'"), 'Live gate LIVE_LEGAL_READY must remain required');
 assert.ok(workerMode.includes("env.LIVE_STRIPE_SANDBOX_E2E_PASSED==='verified'"), 'Live gate LIVE_STRIPE_SANDBOX_E2E_PASSED must remain required');
 assert.ok(workerMode.includes("env.LIVE_UNIT_ECONOMICS_REVIEWED==='verified'"), 'Live gate LIVE_UNIT_ECONOMICS_REVIEWED must remain required');
});
