(function () {
function resolve() {
document.body.removeAttribute('unresolved');
}
if (window.WebComponents) {
addEventListener('WebComponentsReady', resolve);
} else {
if (document.readyState === 'interactive' || document.readyState === 'complete') {
resolve();
} else {
addEventListener('DOMContentLoaded', resolve);
}
}
}());
window.Polymer = {
Settings: function () {
var user = window.Polymer || {};
location.search.slice(1).split('&').forEach(function (o) {
o = o.split('=');
o[0] && (user[o[0]] = o[1] || true);
});
var wantShadow = user.dom === 'shadow';
var hasShadow = Boolean(Element.prototype.createShadowRoot);
var nativeShadow = hasShadow && !window.ShadowDOMPolyfill;
var useShadow = wantShadow && hasShadow;
var hasNativeImports = Boolean('import' in document.createElement('link'));
var useNativeImports = hasNativeImports;
var useNativeCustomElements = !window.CustomElements || window.CustomElements.useNative;
return {
wantShadow: wantShadow,
hasShadow: hasShadow,
nativeShadow: nativeShadow,
useShadow: useShadow,
useNativeShadow: useShadow && nativeShadow,
useNativeImports: useNativeImports,
useNativeCustomElements: useNativeCustomElements
};
}()
};
(function () {
var userPolymer = window.Polymer;
window.Polymer = function (prototype) {
if (typeof prototype === 'function') {
prototype = prototype.prototype;
}
if (!prototype) {
prototype = {};
}
var factory = desugar(prototype);
prototype = factory.prototype;
var options = { prototype: prototype };
if (prototype.extends) {
options.extends = prototype.extends;
}
Polymer.telemetry._registrate(prototype);
document.registerElement(prototype.is, options);
return factory;
};
var desugar = function (prototype) {
var base = Polymer.Base;
if (prototype.extends) {
base = Polymer.Base._getExtendedPrototype(prototype.extends);
}
prototype = Polymer.Base.chainObject(prototype, base);
prototype.registerCallback();
return prototype.constructor;
};
window.Polymer = Polymer;
if (userPolymer) {
for (var i in userPolymer) {
Polymer[i] = userPolymer[i];
}
}
Polymer.Class = desugar;
}());
Polymer.telemetry = {
registrations: [],
_regLog: function (prototype) {
console.log('[' + prototype.is + ']: registered');
},
_registrate: function (prototype) {
this.registrations.push(prototype);
Polymer.log && this._regLog(prototype);
},
dumpRegistrations: function () {
this.registrations.forEach(this._regLog);
}
};
Object.defineProperty(window, 'currentImport', {
enumerable: true,
configurable: true,
get: function () {
return (document._currentScript || document.currentScript).ownerDocument;
}
});
Polymer.RenderStatus = {
_ready: false,
_callbacks: [],
whenReady: function (cb) {
if (this._ready) {
cb();
} else {
this._callbacks.push(cb);
}
},
_makeReady: function () {
this._ready = true;
this._callbacks.forEach(function (cb) {
cb();
});
this._callbacks = [];
},
_catchFirstRender: function () {
requestAnimationFrame(function () {
Polymer.RenderStatus._makeReady();
});
}
};
if (window.HTMLImports) {
HTMLImports.whenReady(function () {
Polymer.RenderStatus._catchFirstRender();
});
} else {
Polymer.RenderStatus._catchFirstRender();
}
Polymer.ImportStatus = Polymer.RenderStatus;
Polymer.ImportStatus.whenLoaded = Polymer.ImportStatus.whenReady;
Polymer.Base = {
__isPolymerInstance__: true,
_addFeature: function (feature) {
this.extend(this, feature);
},
registerCallback: function () {
this._desugarBehaviors();
this._doBehavior('beforeRegister');
this._registerFeatures();
this._doBehavior('registered');
},
createdCallback: function () {
Polymer.telemetry.instanceCount++;
this.root = this;
this._doBehavior('created');
this._initFeatures();
},
attachedCallback: function () {
Polymer.RenderStatus.whenReady(function () {
this.isAttached = true;
this._doBehavior('attached');
}.bind(this));
},
detachedCallback: function () {
this.isAttached = false;
this._doBehavior('detached');
},
attributeChangedCallback: function (name) {
this._attributeChangedImpl(name);
this._doBehavior('attributeChanged', arguments);
},
_attributeChangedImpl: function (name) {
this._setAttributeToProperty(this, name);
},
extend: function (prototype, api) {
if (prototype && api) {
Object.getOwnPropertyNames(api).forEach(function (n) {
this.copyOwnProperty(n, api, prototype);
}, this);
}
return prototype || api;
},
mixin: function (target, source) {
for (var i in source) {
target[i] = source[i];
}
return target;
},
copyOwnProperty: function (name, source, target) {
var pd = Object.getOwnPropertyDescriptor(source, name);
if (pd) {
Object.defineProperty(target, name, pd);
}
},
_log: console.log.apply.bind(console.log, console),
_warn: console.warn.apply.bind(console.warn, console),
_error: console.error.apply.bind(console.error, console),
_logf: function () {
return this._logPrefix.concat([this.is]).concat(Array.prototype.slice.call(arguments, 0));
}
};
Polymer.Base._logPrefix = function () {
var color = window.chrome || /firefox/i.test(navigator.userAgent);
return color ? [
'%c[%s::%s]:',
'font-weight: bold; background-color:#EEEE00;'
] : ['[%s::%s]:'];
}();
Polymer.Base.chainObject = function (object, inherited) {
if (object && inherited && object !== inherited) {
if (!Object.__proto__) {
object = Polymer.Base.extend(Object.create(inherited), object);
}
object.__proto__ = inherited;
}
return object;
};
Polymer.Base = Polymer.Base.chainObject(Polymer.Base, HTMLElement.prototype);
if (window.CustomElements) {
Polymer.instanceof = CustomElements.instanceof;
} else {
Polymer.instanceof = function (obj, ctor) {
return obj instanceof ctor;
};
}
Polymer.isInstance = function (obj) {
return Boolean(obj && obj.__isPolymerInstance__);
};
Polymer.telemetry.instanceCount = 0;
(function () {
var modules = {};
var lcModules = {};
var findModule = function (id) {
return modules[id] || lcModules[id.toLowerCase()];
};
var DomModule = function () {
return document.createElement('dom-module');
};
DomModule.prototype = Object.create(HTMLElement.prototype);
Polymer.Base.extend(DomModule.prototype, {
constructor: DomModule,
createdCallback: function () {
this.register();
},
register: function (id) {
var id = id || this.id || this.getAttribute('name') || this.getAttribute('is');
if (id) {
this.id = id;
modules[id] = this;
lcModules[id.toLowerCase()] = this;
}
},
import: function (id, selector) {
if (id) {
var m = findModule(id);
if (!m) {
forceDocumentUpgrade();
m = findModule(id);
}
if (m && selector) {
m = m.querySelector(selector);
}
return m;
}
}
});
var cePolyfill = window.CustomElements && !CustomElements.useNative;
document.registerElement('dom-module', DomModule);
function forceDocumentUpgrade() {
if (cePolyfill) {
var script = document._currentScript || document.currentScript;
var doc = script && script.ownerDocument;
if (doc) {
CustomElements.upgradeAll(doc);
}
}
}
}());
Polymer.Base._addFeature({
_prepIs: function () {
if (!this.is) {
var module = (document._currentScript || document.currentScript).parentNode;
if (module.localName === 'dom-module') {
var id = module.id || module.getAttribute('name') || module.getAttribute('is');
this.is = id;
}
}
if (this.is) {
this.is = this.is.toLowerCase();
}
}
});
Polymer.Base._addFeature({
behaviors: [],
_desugarBehaviors: function () {
if (this.behaviors.length) {
this.behaviors = this._desugarSomeBehaviors(this.behaviors);
}
},
_desugarSomeBehaviors: function (behaviors) {
behaviors = this._flattenBehaviorsList(behaviors);
for (var i = behaviors.length - 1; i >= 0; i--) {
this._mixinBehavior(behaviors[i]);
}
return behaviors;
},
_flattenBehaviorsList: function (behaviors) {
var flat = [];
behaviors.forEach(function (b) {
if (b instanceof Array) {
flat = flat.concat(this._flattenBehaviorsList(b));
} else if (b) {
flat.push(b);
} else {
this._warn(this._logf('_flattenBehaviorsList', 'behavior is null, check for missing or 404 import'));
}
}, this);
return flat;
},
_mixinBehavior: function (b) {
Object.getOwnPropertyNames(b).forEach(function (n) {
switch (n) {
case 'hostAttributes':
case 'registered':
case 'properties':
case 'observers':
case 'listeners':
case 'created':
case 'attached':
case 'detached':
case 'attributeChanged':
case 'configure':
case 'ready':
break;
default:
if (!this.hasOwnProperty(n)) {
this.copyOwnProperty(n, b, this);
}
break;
}
}, this);
},
_prepBehaviors: function () {
this._prepFlattenedBehaviors(this.behaviors);
},
_prepFlattenedBehaviors: function (behaviors) {
for (var i = 0, l = behaviors.length; i < l; i++) {
this._prepBehavior(behaviors[i]);
}
this._prepBehavior(this);
},
_doBehavior: function (name, args) {
this.behaviors.forEach(function (b) {
this._invokeBehavior(b, name, args);
}, this);
this._invokeBehavior(this, name, args);
},
_invokeBehavior: function (b, name, args) {
var fn = b[name];
if (fn) {
fn.apply(this, args || Polymer.nar);
}
},
_marshalBehaviors: function () {
this.behaviors.forEach(function (b) {
this._marshalBehavior(b);
}, this);
this._marshalBehavior(this);
}
});
Polymer.Base._addFeature({
_getExtendedPrototype: function (tag) {
return this._getExtendedNativePrototype(tag);
},
_nativePrototypes: {},
_getExtendedNativePrototype: function (tag) {
var p = this._nativePrototypes[tag];
if (!p) {
var np = this.getNativePrototype(tag);
p = this.extend(Object.create(np), Polymer.Base);
this._nativePrototypes[tag] = p;
}
return p;
},
getNativePrototype: function (tag) {
return Object.getPrototypeOf(document.createElement(tag));
}
});
Polymer.Base._addFeature({
_prepConstructor: function () {
this._factoryArgs = this.extends ? [
this.extends,
this.is
] : [this.is];
var ctor = function () {
return this._factory(arguments);
};
if (this.hasOwnProperty('extends')) {
ctor.extends = this.extends;
}
Object.defineProperty(this, 'constructor', {
value: ctor,
writable: true,
configurable: true
});
ctor.prototype = this;
},
_factory: function (args) {
var elt = document.createElement.apply(document, this._factoryArgs);
if (this.factoryImpl) {
this.factoryImpl.apply(elt, args);
}
return elt;
}
});
Polymer.nob = Object.create(null);
Polymer.Base._addFeature({
properties: {},
getPropertyInfo: function (property) {
var info = this._getPropertyInfo(property, this.properties);
if (!info) {
this.behaviors.some(function (b) {
return info = this._getPropertyInfo(property, b.properties);
}, this);
}
return info || Polymer.nob;
},
_getPropertyInfo: function (property, properties) {
var p = properties && properties[property];
if (typeof p === 'function') {
p = properties[property] = { type: p };
}
if (p) {
p.defined = true;
}
return p;
}
});
Polymer.CaseMap = {
_caseMap: {},
dashToCamelCase: function (dash) {
var mapped = Polymer.CaseMap._caseMap[dash];
if (mapped) {
return mapped;
}
if (dash.indexOf('-') < 0) {
return Polymer.CaseMap._caseMap[dash] = dash;
}
return Polymer.CaseMap._caseMap[dash] = dash.replace(/-([a-z])/g, function (m) {
return m[1].toUpperCase();
});
},
camelToDashCase: function (camel) {
var mapped = Polymer.CaseMap._caseMap[camel];
if (mapped) {
return mapped;
}
return Polymer.CaseMap._caseMap[camel] = camel.replace(/([a-z][A-Z])/g, function (g) {
return g[0] + '-' + g[1].toLowerCase();
});
}
};
Polymer.Base._addFeature({
_prepAttributes: function () {
this._aggregatedAttributes = {};
},
_addHostAttributes: function (attributes) {
if (attributes) {
this.mixin(this._aggregatedAttributes, attributes);
}
},
_marshalHostAttributes: function () {
this._applyAttributes(this, this._aggregatedAttributes);
},
_applyAttributes: function (node, attr$) {
for (var n in attr$) {
if (!this.hasAttribute(n) && n !== 'class') {
this.serializeValueToAttribute(attr$[n], n, this);
}
}
},
_marshalAttributes: function () {
this._takeAttributesToModel(this);
},
_takeAttributesToModel: function (model) {
for (var i = 0, l = this.attributes.length; i < l; i++) {
this._setAttributeToProperty(model, this.attributes[i].name);
}
},
_setAttributeToProperty: function (model, attrName) {
if (!this._serializing) {
var propName = Polymer.CaseMap.dashToCamelCase(attrName);
var info = this.getPropertyInfo(propName);
if (info.defined || this._propertyEffects && this._propertyEffects[propName]) {
var val = this.getAttribute(attrName);
model[propName] = this.deserialize(val, info.type);
}
}
},
_serializing: false,
reflectPropertyToAttribute: function (name) {
this._serializing = true;
this.serializeValueToAttribute(this[name], Polymer.CaseMap.camelToDashCase(name));
this._serializing = false;
},
serializeValueToAttribute: function (value, attribute, node) {
var str = this.serialize(value);
(node || this)[str === undefined ? 'removeAttribute' : 'setAttribute'](attribute, str);
},
deserialize: function (value, type) {
switch (type) {
case Number:
value = Number(value);
break;
case Boolean:
value = value !== null;
break;
case Object:
try {
value = JSON.parse(value);
} catch (x) {
}
break;
case Array:
try {
value = JSON.parse(value);
} catch (x) {
value = null;
console.warn('Polymer::Attributes: couldn`t decode Array as JSON');
}
break;
case Date:
value = new Date(value);
break;
case String:
default:
break;
}
return value;
},
serialize: function (value) {
switch (typeof value) {
case 'boolean':
return value ? '' : undefined;
case 'object':
if (value instanceof Date) {
return value;
} else if (value) {
try {
return JSON.stringify(value);
} catch (x) {
return '';
}
}
default:
return value != null ? value : undefined;
}
}
});
Polymer.Base._addFeature({
_setupDebouncers: function () {
this._debouncers = {};
},
debounce: function (jobName, callback, wait) {
return this._debouncers[jobName] = Polymer.Debounce.call(this, this._debouncers[jobName], callback, wait);
},
isDebouncerActive: function (jobName) {
var debouncer = this._debouncers[jobName];
return debouncer && debouncer.finish;
},
flushDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.complete();
}
},
cancelDebouncer: function (jobName) {
var debouncer = this._debouncers[jobName];
if (debouncer) {
debouncer.stop();
}
}
});
Polymer.version = '1.1.5';
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_marshalBehavior: function (b) {
},
_initFeatures: function () {
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
}
});
Polymer.Base._addFeature({
_prepTemplate: function () {
this._template = this._template || Polymer.DomModule.import(this.is, 'template');
if (this._template && this._template.hasAttribute('is')) {
this._warn(this._logf('_prepTemplate', 'top-level Polymer template ' + 'must not be a type-extension, found', this._template, 'Move inside simple <template>.'));
}
if (this._template && !this._template.content && HTMLTemplateElement.bootstrap) {
HTMLTemplateElement.decorate(this._template);
HTMLTemplateElement.bootstrap(this._template.content);
}
},
_stampTemplate: function () {
if (this._template) {
this.root = this.instanceTemplate(this._template);
}
},
instanceTemplate: function (template) {
var dom = document.importNode(template._content || template.content, true);
return dom;
}
});
(function () {
var baseAttachedCallback = Polymer.Base.attachedCallback;
Polymer.Base._addFeature({
_hostStack: [],
ready: function () {
},
_pushHost: function (host) {
this.dataHost = host = host || Polymer.Base._hostStack[Polymer.Base._hostStack.length - 1];
if (host && host._clients) {
host._clients.push(this);
}
this._beginHost();
},
_beginHost: function () {
Polymer.Base._hostStack.push(this);
if (!this._clients) {
this._clients = [];
}
},
_popHost: function () {
Polymer.Base._hostStack.pop();
},
_tryReady: function () {
if (this._canReady()) {
this._ready();
}
},
_canReady: function () {
return !this.dataHost || this.dataHost._clientsReadied;
},
_ready: function () {
this._beforeClientsReady();
this._setupRoot();
this._readyClients();
this._afterClientsReady();
this._readySelf();
},
_readyClients: function () {
this._beginDistribute();
var c$ = this._clients;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._ready();
}
this._finishDistribute();
this._clientsReadied = true;
this._clients = null;
},
_readySelf: function () {
this._doBehavior('ready');
this._readied = true;
if (this._attachedPending) {
this._attachedPending = false;
this.attachedCallback();
}
},
_beforeClientsReady: function () {
},
_afterClientsReady: function () {
},
_beforeAttached: function () {
},
attachedCallback: function () {
if (this._readied) {
this._beforeAttached();
baseAttachedCallback.call(this);
} else {
this._attachedPending = true;
}
}
});
}());
Polymer.ArraySplice = function () {
function newSplice(index, removed, addedCount) {
return {
index: index,
removed: removed,
addedCount: addedCount
};
}
var EDIT_LEAVE = 0;
var EDIT_UPDATE = 1;
var EDIT_ADD = 2;
var EDIT_DELETE = 3;
function ArraySplice() {
}
ArraySplice.prototype = {
calcEditDistances: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var rowCount = oldEnd - oldStart + 1;
var columnCount = currentEnd - currentStart + 1;
var distances = new Array(rowCount);
for (var i = 0; i < rowCount; i++) {
distances[i] = new Array(columnCount);
distances[i][0] = i;
}
for (var j = 0; j < columnCount; j++)
distances[0][j] = j;
for (var i = 1; i < rowCount; i++) {
for (var j = 1; j < columnCount; j++) {
if (this.equals(current[currentStart + j - 1], old[oldStart + i - 1]))
distances[i][j] = distances[i - 1][j - 1];
else {
var north = distances[i - 1][j] + 1;
var west = distances[i][j - 1] + 1;
distances[i][j] = north < west ? north : west;
}
}
}
return distances;
},
spliceOperationsFromEditDistances: function (distances) {
var i = distances.length - 1;
var j = distances[0].length - 1;
var current = distances[i][j];
var edits = [];
while (i > 0 || j > 0) {
if (i == 0) {
edits.push(EDIT_ADD);
j--;
continue;
}
if (j == 0) {
edits.push(EDIT_DELETE);
i--;
continue;
}
var northWest = distances[i - 1][j - 1];
var west = distances[i - 1][j];
var north = distances[i][j - 1];
var min;
if (west < north)
min = west < northWest ? west : northWest;
else
min = north < northWest ? north : northWest;
if (min == northWest) {
if (northWest == current) {
edits.push(EDIT_LEAVE);
} else {
edits.push(EDIT_UPDATE);
current = northWest;
}
i--;
j--;
} else if (min == west) {
edits.push(EDIT_DELETE);
i--;
current = west;
} else {
edits.push(EDIT_ADD);
j--;
current = north;
}
}
edits.reverse();
return edits;
},
calcSplices: function (current, currentStart, currentEnd, old, oldStart, oldEnd) {
var prefixCount = 0;
var suffixCount = 0;
var minLength = Math.min(currentEnd - currentStart, oldEnd - oldStart);
if (currentStart == 0 && oldStart == 0)
prefixCount = this.sharedPrefix(current, old, minLength);
if (currentEnd == current.length && oldEnd == old.length)
suffixCount = this.sharedSuffix(current, old, minLength - prefixCount);
currentStart += prefixCount;
oldStart += prefixCount;
currentEnd -= suffixCount;
oldEnd -= suffixCount;
if (currentEnd - currentStart == 0 && oldEnd - oldStart == 0)
return [];
if (currentStart == currentEnd) {
var splice = newSplice(currentStart, [], 0);
while (oldStart < oldEnd)
splice.removed.push(old[oldStart++]);
return [splice];
} else if (oldStart == oldEnd)
return [newSplice(currentStart, [], currentEnd - currentStart)];
var ops = this.spliceOperationsFromEditDistances(this.calcEditDistances(current, currentStart, currentEnd, old, oldStart, oldEnd));
var splice = undefined;
var splices = [];
var index = currentStart;
var oldIndex = oldStart;
for (var i = 0; i < ops.length; i++) {
switch (ops[i]) {
case EDIT_LEAVE:
if (splice) {
splices.push(splice);
splice = undefined;
}
index++;
oldIndex++;
break;
case EDIT_UPDATE:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
case EDIT_ADD:
if (!splice)
splice = newSplice(index, [], 0);
splice.addedCount++;
index++;
break;
case EDIT_DELETE:
if (!splice)
splice = newSplice(index, [], 0);
splice.removed.push(old[oldIndex]);
oldIndex++;
break;
}
}
if (splice) {
splices.push(splice);
}
return splices;
},
sharedPrefix: function (current, old, searchLength) {
for (var i = 0; i < searchLength; i++)
if (!this.equals(current[i], old[i]))
return i;
return searchLength;
},
sharedSuffix: function (current, old, searchLength) {
var index1 = current.length;
var index2 = old.length;
var count = 0;
while (count < searchLength && this.equals(current[--index1], old[--index2]))
count++;
return count;
},
calculateSplices: function (current, previous) {
return this.calcSplices(current, 0, current.length, previous, 0, previous.length);
},
equals: function (currentValue, previousValue) {
return currentValue === previousValue;
}
};
return new ArraySplice();
}();
Polymer.EventApi = function () {
var Settings = Polymer.Settings;
var EventApi = function (event) {
this.event = event;
};
if (Settings.useShadow) {
EventApi.prototype = {
get rootTarget() {
return this.event.path[0];
},
get localTarget() {
return this.event.target;
},
get path() {
return this.event.path;
}
};
} else {
EventApi.prototype = {
get rootTarget() {
return this.event.target;
},
get localTarget() {
var current = this.event.currentTarget;
var currentRoot = current && Polymer.dom(current).getOwnerRoot();
var p$ = this.path;
for (var i = 0; i < p$.length; i++) {
if (Polymer.dom(p$[i]).getOwnerRoot() === currentRoot) {
return p$[i];
}
}
},
get path() {
if (!this.event._path) {
var path = [];
var o = this.rootTarget;
while (o) {
path.push(o);
o = Polymer.dom(o).parentNode || o.host;
}
path.push(window);
this.event._path = path;
}
return this.event._path;
}
};
}
var factory = function (event) {
if (!event.__eventApi) {
event.__eventApi = new EventApi(event);
}
return event.__eventApi;
};
return { factory: factory };
}();
Polymer.domInnerHTML = function () {
var escapeAttrRegExp = /[&\u00A0"]/g;
var escapeDataRegExp = /[&\u00A0<>]/g;
function escapeReplace(c) {
switch (c) {
case '&':
return '&amp;';
case '<':
return '&lt;';
case '>':
return '&gt;';
case '"':
return '&quot;';
case '\xA0':
return '&nbsp;';
}
}
function escapeAttr(s) {
return s.replace(escapeAttrRegExp, escapeReplace);
}
function escapeData(s) {
return s.replace(escapeDataRegExp, escapeReplace);
}
function makeSet(arr) {
var set = {};
for (var i = 0; i < arr.length; i++) {
set[arr[i]] = true;
}
return set;
}
var voidElements = makeSet([
'area',
'base',
'br',
'col',
'command',
'embed',
'hr',
'img',
'input',
'keygen',
'link',
'meta',
'param',
'source',
'track',
'wbr'
]);
var plaintextParents = makeSet([
'style',
'script',
'xmp',
'iframe',
'noembed',
'noframes',
'plaintext',
'noscript'
]);
function getOuterHTML(node, parentNode, composed) {
switch (node.nodeType) {
case Node.ELEMENT_NODE:
var tagName = node.localName;
var s = '<' + tagName;
var attrs = node.attributes;
for (var i = 0, attr; attr = attrs[i]; i++) {
s += ' ' + attr.name + '="' + escapeAttr(attr.value) + '"';
}
s += '>';
if (voidElements[tagName]) {
return s;
}
return s + getInnerHTML(node, composed) + '</' + tagName + '>';
case Node.TEXT_NODE:
var data = node.data;
if (parentNode && plaintextParents[parentNode.localName]) {
return data;
}
return escapeData(data);
case Node.COMMENT_NODE:
return '<!--' + node.data + '-->';
default:
console.error(node);
throw new Error('not implemented');
}
}
function getInnerHTML(node, composed) {
if (node instanceof HTMLTemplateElement)
node = node.content;
var s = '';
var c$ = Polymer.dom(node).childNodes;
c$ = composed ? node._composedChildren : c$;
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
s += getOuterHTML(child, node, composed);
}
return s;
}
return { getInnerHTML: getInnerHTML };
}();
Polymer.DomApi = function () {
'use strict';
var Settings = Polymer.Settings;
var getInnerHTML = Polymer.domInnerHTML.getInnerHTML;
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
var nativeAppendChild = Element.prototype.appendChild;
var nativeCloneNode = Element.prototype.cloneNode;
var nativeImportNode = Document.prototype.importNode;
var DomApi = function (node) {
this.node = node;
if (this.patch) {
this.patch();
}
};
if (window.wrap && Settings.useShadow && !Settings.useNativeShadow) {
DomApi = function (node) {
this.node = wrap(node);
if (this.patch) {
this.patch();
}
};
}
DomApi.prototype = {
flush: function () {
Polymer.dom.flush();
},
_lazyDistribute: function (host) {
if (host.shadyRoot && host.shadyRoot._distributionClean) {
host.shadyRoot._distributionClean = false;
Polymer.dom.addDebouncer(host.debounce('_distribute', host._distributeContent));
}
},
appendChild: function (node) {
return this._addNode(node);
},
insertBefore: function (node, ref_node) {
return this._addNode(node, ref_node);
},
_addNode: function (node, ref_node) {
this._removeNodeFromHost(node, true);
var addedInsertionPoint;
var root = this.getOwnerRoot();
if (root) {
addedInsertionPoint = this._maybeAddInsertionPoint(node, this.node);
}
if (this._nodeHasLogicalChildren(this.node)) {
if (ref_node) {
var children = this.childNodes;
var index = children.indexOf(ref_node);
if (index < 0) {
throw Error('The ref_node to be inserted before is not a child ' + 'of this node');
}
}
this._addLogicalInfo(node, this.node, index);
}
this._addNodeToHost(node);
if (!this._maybeDistribute(node, this.node) && !this._tryRemoveUndistributedNode(node)) {
if (ref_node) {
ref_node = ref_node.localName === CONTENT ? this._firstComposedNode(ref_node) : ref_node;
}
var container = this.node._isShadyRoot ? this.node.host : this.node;
addToComposedParent(container, node, ref_node);
if (ref_node) {
nativeInsertBefore.call(container, node, ref_node);
} else {
nativeAppendChild.call(container, node);
}
}
if (addedInsertionPoint) {
this._updateInsertionPoints(root.host);
}
return node;
},
removeChild: function (node) {
if (factory(node).parentNode !== this.node) {
console.warn('The node to be removed is not a child of this node', node);
}
this._removeNodeFromHost(node);
if (!this._maybeDistribute(node, this.node)) {
var container = this.node._isShadyRoot ? this.node.host : this.node;
if (container === node.parentNode) {
removeFromComposedParent(container, node);
nativeRemoveChild.call(container, node);
}
}
return node;
},
replaceChild: function (node, ref_node) {
this.insertBefore(node, ref_node);
this.removeChild(ref_node);
return node;
},
_hasCachedOwnerRoot: function (node) {
return Boolean(node._ownerShadyRoot !== undefined);
},
getOwnerRoot: function () {
return this._ownerShadyRootForNode(this.node);
},
_ownerShadyRootForNode: function (node) {
if (!node) {
return;
}
if (node._ownerShadyRoot === undefined) {
var root;
if (node._isShadyRoot) {
root = node;
} else {
var parent = Polymer.dom(node).parentNode;
if (parent) {
root = parent._isShadyRoot ? parent : this._ownerShadyRootForNode(parent);
} else {
root = null;
}
}
node._ownerShadyRoot = root;
}
return node._ownerShadyRoot;
},
_maybeDistribute: function (node, parent) {
var fragContent = node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent && Polymer.dom(node).querySelector(CONTENT);
var wrappedContent = fragContent && Polymer.dom(fragContent).parentNode.nodeType !== Node.DOCUMENT_FRAGMENT_NODE;
var hasContent = fragContent || node.localName === CONTENT;
if (hasContent) {
var root = this._ownerShadyRootForNode(parent);
if (root) {
var host = root.host;
this._lazyDistribute(host);
}
}
var parentNeedsDist = this._parentNeedsDistribution(parent);
if (parentNeedsDist) {
this._lazyDistribute(parent);
}
return parentNeedsDist || hasContent && !wrappedContent;
},
_maybeAddInsertionPoint: function (node, parent) {
var added;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE && !node.__noContent) {
var c$ = factory(node).querySelectorAll(CONTENT);
for (var i = 0, n, np, na; i < c$.length && (n = c$[i]); i++) {
np = factory(n).parentNode;
if (np === node) {
np = parent;
}
na = this._maybeAddInsertionPoint(n, np);
added = added || na;
}
} else if (node.localName === CONTENT) {
saveLightChildrenIfNeeded(parent);
saveLightChildrenIfNeeded(node);
added = true;
}
return added;
},
_tryRemoveUndistributedNode: function (node) {
if (this.node.shadyRoot) {
var parent = getComposedParent(node);
if (parent) {
nativeRemoveChild.call(parent, node);
}
return true;
}
},
_updateInsertionPoints: function (host) {
var i$ = host.shadyRoot._insertionPoints = factory(host.shadyRoot).querySelectorAll(CONTENT);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(factory(c).parentNode);
}
},
_nodeHasLogicalChildren: function (node) {
return Boolean(node._lightChildren !== undefined);
},
_parentNeedsDistribution: function (parent) {
return parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot);
},
_removeNodeFromHost: function (node, ensureComposedRemoval) {
var hostNeedsDist;
var root;
var parent = node._lightParent;
if (parent) {
factory(node)._distributeParent();
root = this._ownerShadyRootForNode(node);
if (root) {
root.host._elementRemove(node);
hostNeedsDist = this._removeDistributedChildren(root, node);
}
this._removeLogicalInfo(node, node._lightParent);
}
this._removeOwnerShadyRoot(node);
if (root && hostNeedsDist) {
this._updateInsertionPoints(root.host);
this._lazyDistribute(root.host);
} else if (ensureComposedRemoval) {
removeFromComposedParent(getComposedParent(node), node);
}
},
_removeDistributedChildren: function (root, container) {
var hostNeedsDist;
var ip$ = root._insertionPoints;
for (var i = 0; i < ip$.length; i++) {
var content = ip$[i];
if (this._contains(container, content)) {
var dc$ = factory(content).getDistributedNodes();
for (var j = 0; j < dc$.length; j++) {
hostNeedsDist = true;
var node = dc$[j];
var parent = node.parentNode;
if (parent) {
removeFromComposedParent(parent, node);
nativeRemoveChild.call(parent, node);
}
}
}
}
return hostNeedsDist;
},
_contains: function (container, node) {
while (node) {
if (node == container) {
return true;
}
node = factory(node).parentNode;
}
},
_addNodeToHost: function (node) {
var root = this.getOwnerRoot();
if (root) {
root.host._elementAdd(node);
}
},
_addLogicalInfo: function (node, container, index) {
var children = factory(container).childNodes;
index = index === undefined ? children.length : index;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, n; i < c$.length && (n = c$[i]); i++) {
children.splice(index++, 0, n);
n._lightParent = container;
}
} else {
children.splice(index, 0, node);
node._lightParent = container;
}
},
_removeLogicalInfo: function (node, container) {
var children = factory(container).childNodes;
var index = children.indexOf(node);
if (index < 0 || container !== node._lightParent) {
throw Error('The node to be removed is not a child of this node');
}
children.splice(index, 1);
node._lightParent = null;
},
_removeOwnerShadyRoot: function (node) {
if (this._hasCachedOwnerRoot(node)) {
var c$ = factory(node).childNodes;
for (var i = 0, l = c$.length, n; i < l && (n = c$[i]); i++) {
this._removeOwnerShadyRoot(n);
}
}
node._ownerShadyRoot = undefined;
},
_firstComposedNode: function (content) {
var n$ = factory(content).getDistributedNodes();
for (var i = 0, l = n$.length, n, p$; i < l && (n = n$[i]); i++) {
p$ = factory(n).getDestinationInsertionPoints();
if (p$[p$.length - 1] === content) {
return n;
}
}
},
querySelector: function (selector) {
return this.querySelectorAll(selector)[0];
},
querySelectorAll: function (selector) {
return this._query(function (n) {
return matchesSelector.call(n, selector);
}, this.node);
},
_query: function (matcher, node) {
node = node || this.node;
var list = [];
this._queryElements(factory(node).childNodes, matcher, list);
return list;
},
_queryElements: function (elements, matcher, list) {
for (var i = 0, l = elements.length, c; i < l && (c = elements[i]); i++) {
if (c.nodeType === Node.ELEMENT_NODE) {
this._queryElement(c, matcher, list);
}
}
},
_queryElement: function (node, matcher, list) {
if (matcher(node)) {
list.push(node);
}
this._queryElements(factory(node).childNodes, matcher, list);
},
getDestinationInsertionPoints: function () {
return this.node._destinationInsertionPoints || [];
},
getDistributedNodes: function () {
return this.node._distributedNodes || [];
},
queryDistributedElements: function (selector) {
var c$ = this.childNodes;
var list = [];
this._distributedFilter(selector, c$, list);
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.localName === CONTENT) {
this._distributedFilter(selector, factory(c).getDistributedNodes(), list);
}
}
return list;
},
_distributedFilter: function (selector, list, results) {
results = results || [];
for (var i = 0, l = list.length, d; i < l && (d = list[i]); i++) {
if (d.nodeType === Node.ELEMENT_NODE && d.localName !== CONTENT && matchesSelector.call(d, selector)) {
results.push(d);
}
}
return results;
},
_clear: function () {
while (this.childNodes.length) {
this.removeChild(this.childNodes[0]);
}
},
setAttribute: function (name, value) {
this.node.setAttribute(name, value);
this._distributeParent();
},
removeAttribute: function (name) {
this.node.removeAttribute(name);
this._distributeParent();
},
_distributeParent: function () {
if (this._parentNeedsDistribution(this.parentNode)) {
this._lazyDistribute(this.parentNode);
}
},
cloneNode: function (deep) {
var n = nativeCloneNode.call(this.node, false);
if (deep) {
var c$ = this.childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(c$[i]).cloneNode(true);
d.appendChild(nc);
}
}
return n;
},
importNode: function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
var n = nativeImportNode.call(doc, externalNode, false);
if (deep) {
var c$ = factory(externalNode).childNodes;
var d = factory(n);
for (var i = 0, nc; i < c$.length; i++) {
nc = factory(doc).importNode(c$[i], true);
d.appendChild(nc);
}
}
return n;
}
};
Object.defineProperty(DomApi.prototype, 'classList', {
get: function () {
if (!this._classList) {
this._classList = new DomApi.ClassList(this);
}
return this._classList;
},
configurable: true
});
DomApi.ClassList = function (host) {
this.domApi = host;
this.node = host.node;
};
DomApi.ClassList.prototype = {
add: function () {
this.node.classList.add.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
remove: function () {
this.node.classList.remove.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
toggle: function () {
this.node.classList.toggle.apply(this.node.classList, arguments);
this.domApi._distributeParent();
},
contains: function () {
return this.node.classList.contains.apply(this.node.classList, arguments);
}
};
if (!Settings.useShadow) {
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
var c$ = getLightChildren(this.node);
return Array.isArray(c$) ? c$ : Array.prototype.slice.call(c$);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.filter.call(this.childNodes, function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
configurable: true
},
parentNode: {
get: function () {
return this.node._lightParent || getComposedParent(this.node);
},
configurable: true
},
firstChild: {
get: function () {
return this.childNodes[0];
},
configurable: true
},
lastChild: {
get: function () {
var c$ = this.childNodes;
return c$[c$.length - 1];
},
configurable: true
},
nextSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).childNodes;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
firstElementChild: {
get: function () {
return this.children[0];
},
configurable: true
},
lastElementChild: {
get: function () {
var c$ = this.children;
return c$[c$.length - 1];
},
configurable: true
},
nextElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) + 1];
}
},
configurable: true
},
previousElementSibling: {
get: function () {
var c$ = this.parentNode && factory(this.parentNode).children;
if (c$) {
return c$[Array.prototype.indexOf.call(c$, this.node) - 1];
}
},
configurable: true
},
textContent: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return this.node.textContent;
} else {
var tc = [];
for (var i = 0, cn = this.childNodes, c; c = cn[i]; i++) {
if (c.nodeType !== Node.COMMENT_NODE) {
tc.push(c.textContent);
}
}
return tc.join('');
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
this.node.textContent = text;
} else {
this._clear();
if (text) {
this.appendChild(document.createTextNode(text));
}
}
},
configurable: true
},
innerHTML: {
get: function () {
var nt = this.node.nodeType;
if (nt === Node.TEXT_NODE || nt === Node.COMMENT_NODE) {
return null;
} else {
return getInnerHTML(this.node);
}
},
set: function (text) {
var nt = this.node.nodeType;
if (nt !== Node.TEXT_NODE || nt !== Node.COMMENT_NODE) {
this._clear();
var d = document.createElement('div');
d.innerHTML = text;
var c$ = Array.prototype.slice.call(d.childNodes);
for (var i = 0; i < c$.length; i++) {
this.appendChild(c$[i]);
}
}
},
configurable: true
}
});
DomApi.prototype._getComposedInnerHTML = function () {
return getInnerHTML(this.node, true);
};
} else {
var forwardMethods = [
'cloneNode',
'appendChild',
'insertBefore',
'removeChild',
'replaceChild'
];
forwardMethods.forEach(function (name) {
DomApi.prototype[name] = function () {
return this.node[name].apply(this.node, arguments);
};
});
DomApi.prototype.querySelectorAll = function (selector) {
return Array.prototype.slice.call(this.node.querySelectorAll(selector));
};
DomApi.prototype.getOwnerRoot = function () {
var n = this.node;
while (n) {
if (n.nodeType === Node.DOCUMENT_FRAGMENT_NODE && n.host) {
return n;
}
n = n.parentNode;
}
};
DomApi.prototype.importNode = function (externalNode, deep) {
var doc = this.node instanceof Document ? this.node : this.node.ownerDocument;
return doc.importNode(externalNode, deep);
};
DomApi.prototype.getDestinationInsertionPoints = function () {
var n$ = this.node.getDestinationInsertionPoints && this.node.getDestinationInsertionPoints();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype.getDistributedNodes = function () {
var n$ = this.node.getDistributedNodes && this.node.getDistributedNodes();
return n$ ? Array.prototype.slice.call(n$) : [];
};
DomApi.prototype._distributeParent = function () {
};
Object.defineProperties(DomApi.prototype, {
childNodes: {
get: function () {
return Array.prototype.slice.call(this.node.childNodes);
},
configurable: true
},
children: {
get: function () {
return Array.prototype.slice.call(this.node.children);
},
configurable: true
},
textContent: {
get: function () {
return this.node.textContent;
},
set: function (value) {
return this.node.textContent = value;
},
configurable: true
},
innerHTML: {
get: function () {
return this.node.innerHTML;
},
set: function (value) {
return this.node.innerHTML = value;
},
configurable: true
}
});
var forwardProperties = [
'parentNode',
'firstChild',
'lastChild',
'nextSibling',
'previousSibling',
'firstElementChild',
'lastElementChild',
'nextElementSibling',
'previousElementSibling'
];
forwardProperties.forEach(function (name) {
Object.defineProperty(DomApi.prototype, name, {
get: function () {
return this.node[name];
},
configurable: true
});
});
}
var CONTENT = 'content';
var factory = function (node, patch) {
node = node || document;
if (!node.__domApi) {
node.__domApi = new DomApi(node, patch);
}
return node.__domApi;
};
Polymer.dom = function (obj, patch) {
if (obj instanceof Event) {
return Polymer.EventApi.factory(obj);
} else {
return factory(obj, patch);
}
};
Polymer.Base.extend(Polymer.dom, {
_flushGuard: 0,
_FLUSH_MAX: 100,
_needsTakeRecords: !Polymer.Settings.useNativeCustomElements,
_debouncers: [],
_finishDebouncer: null,
flush: function () {
for (var i = 0; i < this._debouncers.length; i++) {
this._debouncers[i].complete();
}
if (this._finishDebouncer) {
this._finishDebouncer.complete();
}
this._flushPolyfills();
if (this._debouncers.length && this._flushGuard < this._FLUSH_MAX) {
this._flushGuard++;
this.flush();
} else {
if (this._flushGuard >= this._FLUSH_MAX) {
console.warn('Polymer.dom.flush aborted. Flush may not be complete.');
}
this._flushGuard = 0;
}
},
_flushPolyfills: function () {
if (this._needsTakeRecords) {
CustomElements.takeRecords();
}
},
addDebouncer: function (debouncer) {
this._debouncers.push(debouncer);
this._finishDebouncer = Polymer.Debounce(this._finishDebouncer, this._finishFlush);
},
_finishFlush: function () {
Polymer.dom._debouncers = [];
}
});
function getLightChildren(node) {
var children = node._lightChildren;
return children ? children : node.childNodes;
}
function getComposedChildren(node) {
if (!node._composedChildren) {
node._composedChildren = Array.prototype.slice.call(node.childNodes);
}
return node._composedChildren;
}
function addToComposedParent(parent, node, ref_node) {
var children = getComposedChildren(parent);
var i = ref_node ? children.indexOf(ref_node) : -1;
if (node.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
var fragChildren = getComposedChildren(node);
for (var j = 0; j < fragChildren.length; j++) {
addNodeToComposedChildren(fragChildren[j], parent, children, i + j);
}
node._composedChildren = null;
} else {
addNodeToComposedChildren(node, parent, children, i);
}
}
function getComposedParent(node) {
return node.__patched ? node._composedParent : node.parentNode;
}
function addNodeToComposedChildren(node, parent, children, i) {
node._composedParent = parent;
children.splice(i >= 0 ? i : children.length, 0, node);
}
function removeFromComposedParent(parent, node) {
node._composedParent = null;
if (parent) {
var children = getComposedChildren(parent);
var i = children.indexOf(node);
if (i >= 0) {
children.splice(i, 1);
}
}
}
function saveLightChildrenIfNeeded(node) {
if (!node._lightChildren) {
var c$ = Array.prototype.slice.call(node.childNodes);
for (var i = 0, l = c$.length, child; i < l && (child = c$[i]); i++) {
child._lightParent = child._lightParent || node;
}
node._lightChildren = c$;
}
}
function hasInsertionPoint(root) {
return Boolean(root && root._insertionPoints.length);
}
var p = Element.prototype;
var matchesSelector = p.matches || p.matchesSelector || p.mozMatchesSelector || p.msMatchesSelector || p.oMatchesSelector || p.webkitMatchesSelector;
return {
getLightChildren: getLightChildren,
getComposedParent: getComposedParent,
getComposedChildren: getComposedChildren,
removeFromComposedParent: removeFromComposedParent,
saveLightChildrenIfNeeded: saveLightChildrenIfNeeded,
matchesSelector: matchesSelector,
hasInsertionPoint: hasInsertionPoint,
ctor: DomApi,
factory: factory
};
}();
(function () {
Polymer.Base._addFeature({
_prepShady: function () {
this._useContent = this._useContent || Boolean(this._template);
},
_poolContent: function () {
if (this._useContent) {
saveLightChildrenIfNeeded(this);
}
},
_setupRoot: function () {
if (this._useContent) {
this._createLocalRoot();
if (!this.dataHost) {
upgradeLightChildren(this._lightChildren);
}
}
},
_createLocalRoot: function () {
this.shadyRoot = this.root;
this.shadyRoot._distributionClean = false;
this.shadyRoot._isShadyRoot = true;
this.shadyRoot._dirtyRoots = [];
var i$ = this.shadyRoot._insertionPoints = !this._notes || this._notes._hasContent ? this.shadyRoot.querySelectorAll('content') : [];
saveLightChildrenIfNeeded(this.shadyRoot);
for (var i = 0, c; i < i$.length; i++) {
c = i$[i];
saveLightChildrenIfNeeded(c);
saveLightChildrenIfNeeded(c.parentNode);
}
this.shadyRoot.host = this;
},
get domHost() {
var root = Polymer.dom(this).getOwnerRoot();
return root && root.host;
},
distributeContent: function (updateInsertionPoints) {
if (this.shadyRoot) {
var dom = Polymer.dom(this);
if (updateInsertionPoints) {
dom._updateInsertionPoints(this);
}
var host = getTopDistributingHost(this);
dom._lazyDistribute(host);
}
},
_distributeContent: function () {
if (this._useContent && !this.shadyRoot._distributionClean) {
this._beginDistribute();
this._distributeDirtyRoots();
this._finishDistribute();
}
},
_beginDistribute: function () {
if (this._useContent && hasInsertionPoint(this.shadyRoot)) {
this._resetDistribution();
this._distributePool(this.shadyRoot, this._collectPool());
}
},
_distributeDirtyRoots: function () {
var c$ = this.shadyRoot._dirtyRoots;
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
c._distributeContent();
}
this.shadyRoot._dirtyRoots = [];
},
_finishDistribute: function () {
if (this._useContent) {
this.shadyRoot._distributionClean = true;
if (hasInsertionPoint(this.shadyRoot)) {
this._composeTree();
} else {
if (!this.shadyRoot._hasDistributed) {
this.textContent = '';
this._composedChildren = null;
this.appendChild(this.shadyRoot);
} else {
var children = this._composeNode(this);
this._updateChildNodes(this, children);
}
}
this.shadyRoot._hasDistributed = true;
}
},
elementMatches: function (selector, node) {
node = node || this;
return matchesSelector.call(node, selector);
},
_resetDistribution: function () {
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (child._destinationInsertionPoints) {
child._destinationInsertionPoints = undefined;
}
if (isInsertionPoint(child)) {
clearDistributedDestinationInsertionPoints(child);
}
}
var root = this.shadyRoot;
var p$ = root._insertionPoints;
for (var j = 0; j < p$.length; j++) {
p$[j]._distributedNodes = [];
}
},
_collectPool: function () {
var pool = [];
var children = getLightChildren(this);
for (var i = 0; i < children.length; i++) {
var child = children[i];
if (isInsertionPoint(child)) {
pool.push.apply(pool, child._distributedNodes);
} else {
pool.push(child);
}
}
return pool;
},
_distributePool: function (node, pool) {
var p$ = node._insertionPoints;
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
this._distributeInsertionPoint(p, pool);
maybeRedistributeParent(p, this);
}
},
_distributeInsertionPoint: function (content, pool) {
var anyDistributed = false;
for (var i = 0, l = pool.length, node; i < l; i++) {
node = pool[i];
if (!node) {
continue;
}
if (this._matchesContentSelect(node, content)) {
distributeNodeInto(node, content);
pool[i] = undefined;
anyDistributed = true;
}
}
if (!anyDistributed) {
var children = getLightChildren(content);
for (var j = 0; j < children.length; j++) {
distributeNodeInto(children[j], content);
}
}
},
_composeTree: function () {
this._updateChildNodes(this, this._composeNode(this));
var p$ = this.shadyRoot._insertionPoints;
for (var i = 0, l = p$.length, p, parent; i < l && (p = p$[i]); i++) {
parent = p._lightParent || p.parentNode;
if (!parent._useContent && parent !== this && parent !== this.shadyRoot) {
this._updateChildNodes(parent, this._composeNode(parent));
}
}
},
_composeNode: function (node) {
var children = [];
var c$ = getLightChildren(node.shadyRoot || node);
for (var i = 0; i < c$.length; i++) {
var child = c$[i];
if (isInsertionPoint(child)) {
var distributedNodes = child._distributedNodes;
for (var j = 0; j < distributedNodes.length; j++) {
var distributedNode = distributedNodes[j];
if (isFinalDestination(child, distributedNode)) {
children.push(distributedNode);
}
}
} else {
children.push(child);
}
}
return children;
},
_updateChildNodes: function (container, children) {
var composed = getComposedChildren(container);
var splices = Polymer.ArraySplice.calculateSplices(children, composed);
for (var i = 0, d = 0, s; i < splices.length && (s = splices[i]); i++) {
for (var j = 0, n; j < s.removed.length && (n = s.removed[j]); j++) {
if (getComposedParent(n) === container) {
remove(n);
}
composed.splice(s.index + d, 1);
}
d -= s.addedCount;
}
for (var i = 0, s, next; i < splices.length && (s = splices[i]); i++) {
next = composed[s.index];
for (var j = s.index, n; j < s.index + s.addedCount; j++) {
n = children[j];
insertBefore(container, n, next);
composed.splice(j, 0, n);
}
}
ensureComposedParent(container, children);
},
_matchesContentSelect: function (node, contentElement) {
var select = contentElement.getAttribute('select');
if (!select) {
return true;
}
select = select.trim();
if (!select) {
return true;
}
if (!(node instanceof Element)) {
return false;
}
var validSelectors = /^(:not\()?[*.#[a-zA-Z_|]/;
if (!validSelectors.test(select)) {
return false;
}
return this.elementMatches(select, node);
},
_elementAdd: function () {
},
_elementRemove: function () {
}
});
var saveLightChildrenIfNeeded = Polymer.DomApi.saveLightChildrenIfNeeded;
var getLightChildren = Polymer.DomApi.getLightChildren;
var matchesSelector = Polymer.DomApi.matchesSelector;
var hasInsertionPoint = Polymer.DomApi.hasInsertionPoint;
var getComposedChildren = Polymer.DomApi.getComposedChildren;
var getComposedParent = Polymer.DomApi.getComposedParent;
var removeFromComposedParent = Polymer.DomApi.removeFromComposedParent;
function distributeNodeInto(child, insertionPoint) {
insertionPoint._distributedNodes.push(child);
var points = child._destinationInsertionPoints;
if (!points) {
child._destinationInsertionPoints = [insertionPoint];
} else {
points.push(insertionPoint);
}
}
function clearDistributedDestinationInsertionPoints(content) {
var e$ = content._distributedNodes;
if (e$) {
for (var i = 0; i < e$.length; i++) {
var d = e$[i]._destinationInsertionPoints;
if (d) {
d.splice(d.indexOf(content) + 1, d.length);
}
}
}
}
function maybeRedistributeParent(content, host) {
var parent = content._lightParent;
if (parent && parent.shadyRoot && hasInsertionPoint(parent.shadyRoot) && parent.shadyRoot._distributionClean) {
parent.shadyRoot._distributionClean = false;
host.shadyRoot._dirtyRoots.push(parent);
}
}
function isFinalDestination(insertionPoint, node) {
var points = node._destinationInsertionPoints;
return points && points[points.length - 1] === insertionPoint;
}
function isInsertionPoint(node) {
return node.localName == 'content';
}
var nativeInsertBefore = Element.prototype.insertBefore;
var nativeRemoveChild = Element.prototype.removeChild;
function insertBefore(parentNode, newChild, refChild) {
var newChildParent = getComposedParent(newChild);
if (newChildParent !== parentNode) {
removeFromComposedParent(newChildParent, newChild);
}
remove(newChild);
nativeInsertBefore.call(parentNode, newChild, refChild || null);
newChild._composedParent = parentNode;
}
function remove(node) {
var parentNode = getComposedParent(node);
if (parentNode) {
node._composedParent = null;
nativeRemoveChild.call(parentNode, node);
}
}
function ensureComposedParent(parent, children) {
for (var i = 0, n; i < children.length; i++) {
children[i]._composedParent = parent;
}
}
function getTopDistributingHost(host) {
while (host && hostNeedsRedistribution(host)) {
host = host.domHost;
}
return host;
}
function hostNeedsRedistribution(host) {
var c$ = Polymer.dom(host).children;
for (var i = 0, c; i < c$.length; i++) {
c = c$[i];
if (c.localName === 'content') {
return host.domHost;
}
}
}
var needsUpgrade = window.CustomElements && !CustomElements.useNative;
function upgradeLightChildren(children) {
if (needsUpgrade && children) {
for (var i = 0; i < children.length; i++) {
CustomElements.upgrade(children[i]);
}
}
}
}());
if (Polymer.Settings.useShadow) {
Polymer.Base._addFeature({
_poolContent: function () {
},
_beginDistribute: function () {
},
distributeContent: function () {
},
_distributeContent: function () {
},
_finishDistribute: function () {
},
_createLocalRoot: function () {
this.createShadowRoot();
this.shadowRoot.appendChild(this.root);
this.root = this.shadowRoot;
}
});
}
Polymer.DomModule = document.createElement('dom-module');
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepBehaviors();
this._prepConstructor();
this._prepTemplate();
this._prepShady();
},
_prepBehavior: function (b) {
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalHostAttributes();
this._setupDebouncers();
this._marshalBehaviors();
this._tryReady();
},
_marshalBehavior: function (b) {
}
});
Polymer.nar = [];
Polymer.Annotations = {
parseAnnotations: function (template) {
var list = [];
var content = template._content || template.content;
this._parseNodeAnnotations(content, list);
return list;
},
_parseNodeAnnotations: function (node, list) {
return node.nodeType === Node.TEXT_NODE ? this._parseTextNodeAnnotation(node, list) : this._parseElementAnnotations(node, list);
},
_testEscape: function (value) {
var escape = value.slice(0, 2);
if (escape === '{{' || escape === '[[') {
return escape;
}
},
_parseTextNodeAnnotation: function (node, list) {
var v = node.textContent;
var escape = this._testEscape(v);
if (escape) {
node.textContent = ' ';
var annote = {
bindings: [{
kind: 'text',
mode: escape[0],
value: v.slice(2, -2).trim()
}]
};
list.push(annote);
return annote;
}
},
_parseElementAnnotations: function (element, list) {
var annote = {
bindings: [],
events: []
};
if (element.localName === 'content') {
list._hasContent = true;
}
this._parseChildNodesAnnotations(element, annote, list);
if (element.attributes) {
this._parseNodeAttributeAnnotations(element, annote, list);
if (this.prepElement) {
this.prepElement(element);
}
}
if (annote.bindings.length || annote.events.length || annote.id) {
list.push(annote);
}
return annote;
},
_parseChildNodesAnnotations: function (root, annote, list, callback) {
if (root.firstChild) {
for (var i = 0, node = root.firstChild; node; node = node.nextSibling, i++) {
if (node.localName === 'template' && !node.hasAttribute('preserve-content')) {
this._parseTemplate(node, i, list, annote);
}
if (node.nodeType === Node.TEXT_NODE) {
var n = node.nextSibling;
while (n && n.nodeType === Node.TEXT_NODE) {
node.textContent += n.textContent;
root.removeChild(n);
n = n.nextSibling;
}
}
var childAnnotation = this._parseNodeAnnotations(node, list, callback);
if (childAnnotation) {
childAnnotation.parent = annote;
childAnnotation.index = i;
}
}
}
},
_parseTemplate: function (node, index, list, parent) {
var content = document.createDocumentFragment();
content._notes = this.parseAnnotations(node);
content.appendChild(node.content);
list.push({
bindings: Polymer.nar,
events: Polymer.nar,
templateContent: content,
parent: parent,
index: index
});
},
_parseNodeAttributeAnnotations: function (node, annotation) {
for (var i = node.attributes.length - 1, a; a = node.attributes[i]; i--) {
var n = a.name, v = a.value;
if (n === 'id' && !this._testEscape(v)) {
annotation.id = v;
} else if (n.slice(0, 3) === 'on-') {
node.removeAttribute(n);
annotation.events.push({
name: n.slice(3),
value: v
});
} else {
var b = this._parseNodeAttributeAnnotation(node, n, v);
if (b) {
annotation.bindings.push(b);
}
}
}
},
_parseNodeAttributeAnnotation: function (node, n, v) {
var escape = this._testEscape(v);
if (escape) {
var customEvent;
var name = n;
var mode = escape[0];
v = v.slice(2, -2).trim();
var not = false;
if (v[0] == '!') {
v = v.substring(1);
not = true;
}
var kind = 'property';
if (n[n.length - 1] == '$') {
name = n.slice(0, -1);
kind = 'attribute';
}
var notifyEvent, colon;
if (mode == '{' && (colon = v.indexOf('::')) > 0) {
notifyEvent = v.substring(colon + 2);
v = v.substring(0, colon);
customEvent = true;
}
if (node.localName == 'input' && n == 'value') {
node.setAttribute(n, '');
}
node.removeAttribute(n);
if (kind === 'property') {
name = Polymer.CaseMap.dashToCamelCase(name);
}
return {
kind: kind,
mode: mode,
name: name,
value: v,
negate: not,
event: notifyEvent,
customEvent: customEvent
};
}
},
_localSubTree: function (node, host) {
return node === host ? node.childNodes : node._lightChildren || node.childNodes;
},
findAnnotatedNode: function (root, annote) {
var parent = annote.parent && Polymer.Annotations.findAnnotatedNode(root, annote.parent);
return !parent ? root : Polymer.Annotations._localSubTree(parent, root)[annote.index];
}
};
(function () {
function resolveCss(cssText, ownerDocument) {
return cssText.replace(CSS_URL_RX, function (m, pre, url, post) {
return pre + '\'' + resolve(url.replace(/["']/g, ''), ownerDocument) + '\'' + post;
});
}
function resolveAttrs(element, ownerDocument) {
for (var name in URL_ATTRS) {
var a$ = URL_ATTRS[name];
for (var i = 0, l = a$.length, a, at, v; i < l && (a = a$[i]); i++) {
if (name === '*' || element.localName === name) {
at = element.attributes[a];
v = at && at.value;
if (v && v.search(BINDING_RX) < 0) {
at.value = a === 'style' ? resolveCss(v, ownerDocument) : resolve(v, ownerDocument);
}
}
}
}
}
function resolve(url, ownerDocument) {
if (url && url[0] === '#') {
return url;
}
var resolver = getUrlResolver(ownerDocument);
resolver.href = url;
return resolver.href || url;
}
var tempDoc;
var tempDocBase;
function resolveUrl(url, baseUri) {
if (!tempDoc) {
tempDoc = document.implementation.createHTMLDocument('temp');
tempDocBase = tempDoc.createElement('base');
tempDoc.head.appendChild(tempDocBase);
}
tempDocBase.href = baseUri;
return resolve(url, tempDoc);
}
function getUrlResolver(ownerDocument) {
return ownerDocument.__urlResolver || (ownerDocument.__urlResolver = ownerDocument.createElement('a'));
}
var CSS_URL_RX = /(url\()([^)]*)(\))/g;
var URL_ATTRS = {
'*': [
'href',
'src',
'style',
'url'
],
form: ['action']
};
var BINDING_RX = /\{\{|\[\[/;
Polymer.ResolveUrl = {
resolveCss: resolveCss,
resolveAttrs: resolveAttrs,
resolveUrl: resolveUrl
};
}());
Polymer.Base._addFeature({
_prepAnnotations: function () {
if (!this._template) {
this._notes = [];
} else {
Polymer.Annotations.prepElement = this._prepElement.bind(this);
if (this._template._content && this._template._content._notes) {
this._notes = this._template._content._notes;
} else {
this._notes = Polymer.Annotations.parseAnnotations(this._template);
}
this._processAnnotations(this._notes);
Polymer.Annotations.prepElement = null;
}
},
_processAnnotations: function (notes) {
for (var i = 0; i < notes.length; i++) {
var note = notes[i];
for (var j = 0; j < note.bindings.length; j++) {
var b = note.bindings[j];
b.signature = this._parseMethod(b.value);
if (!b.signature) {
b.model = this._modelForPath(b.value);
}
}
if (note.templateContent) {
this._processAnnotations(note.templateContent._notes);
var pp = note.templateContent._parentProps = this._discoverTemplateParentProps(note.templateContent._notes);
var bindings = [];
for (var prop in pp) {
bindings.push({
index: note.index,
kind: 'property',
mode: '{',
name: '_parent_' + prop,
model: prop,
value: prop
});
}
note.bindings = note.bindings.concat(bindings);
}
}
},
_discoverTemplateParentProps: function (notes) {
var pp = {};
notes.forEach(function (n) {
n.bindings.forEach(function (b) {
if (b.signature) {
var args = b.signature.args;
for (var k = 0; k < args.length; k++) {
pp[args[k].model] = true;
}
} else {
pp[b.model] = true;
}
});
if (n.templateContent) {
var tpp = n.templateContent._parentProps;
Polymer.Base.mixin(pp, tpp);
}
});
return pp;
},
_prepElement: function (element) {
Polymer.ResolveUrl.resolveAttrs(element, this._template.ownerDocument);
},
_findAnnotatedNode: Polymer.Annotations.findAnnotatedNode,
_marshalAnnotationReferences: function () {
if (this._template) {
this._marshalIdNodes();
this._marshalAnnotatedNodes();
this._marshalAnnotatedListeners();
}
},
_configureAnnotationReferences: function () {
this._configureTemplateContent();
},
_configureTemplateContent: function () {
this._notes.forEach(function (note, i) {
if (note.templateContent) {
this._nodes[i]._content = note.templateContent;
}
}, this);
},
_marshalIdNodes: function () {
this.$ = {};
this._notes.forEach(function (a) {
if (a.id) {
this.$[a.id] = this._findAnnotatedNode(this.root, a);
}
}, this);
},
_marshalAnnotatedNodes: function () {
if (this._nodes) {
this._nodes = this._nodes.map(function (a) {
return this._findAnnotatedNode(this.root, a);
}, this);
}
},
_marshalAnnotatedListeners: function () {
this._notes.forEach(function (a) {
if (a.events && a.events.length) {
var node = this._findAnnotatedNode(this.root, a);
a.events.forEach(function (e) {
this.listen(node, e.name, e.value);
}, this);
}
}, this);
}
});
Polymer.Base._addFeature({
listeners: {},
_listenListeners: function (listeners) {
var node, name, key;
for (key in listeners) {
if (key.indexOf('.') < 0) {
node = this;
name = key;
} else {
name = key.split('.');
node = this.$[name[0]];
name = name[1];
}
this.listen(node, name, listeners[key]);
}
},
listen: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (!handler) {
handler = this._createEventHandler(node, eventName, methodName);
}
if (handler._listening) {
return;
}
this._listen(node, eventName, handler);
handler._listening = true;
},
_boundListenerKey: function (eventName, methodName) {
return eventName + ':' + methodName;
},
_recordEventHandler: function (host, eventName, target, methodName, handler) {
var hbl = host.__boundListeners;
if (!hbl) {
hbl = host.__boundListeners = new WeakMap();
}
var bl = hbl.get(target);
if (!bl) {
bl = {};
hbl.set(target, bl);
}
var key = this._boundListenerKey(eventName, methodName);
bl[key] = handler;
},
_recallEventHandler: function (host, eventName, target, methodName) {
var hbl = host.__boundListeners;
if (!hbl) {
return;
}
var bl = hbl.get(target);
if (!bl) {
return;
}
var key = this._boundListenerKey(eventName, methodName);
return bl[key];
},
_createEventHandler: function (node, eventName, methodName) {
var host = this;
var handler = function (e) {
if (host[methodName]) {
host[methodName](e, e.detail);
} else {
host._warn(host._logf('_createEventHandler', 'listener method `' + methodName + '` not defined'));
}
};
handler._listening = false;
this._recordEventHandler(host, eventName, node, methodName, handler);
return handler;
},
unlisten: function (node, eventName, methodName) {
var handler = this._recallEventHandler(this, eventName, node, methodName);
if (handler) {
this._unlisten(node, eventName, handler);
handler._listening = false;
}
},
_listen: function (node, eventName, handler) {
node.addEventListener(eventName, handler);
},
_unlisten: function (node, eventName, handler) {
node.removeEventListener(eventName, handler);
}
});
(function () {
'use strict';
var HAS_NATIVE_TA = typeof document.head.style.touchAction === 'string';
var GESTURE_KEY = '__polymerGestures';
var HANDLED_OBJ = '__polymerGesturesHandled';
var TOUCH_ACTION = '__polymerGesturesTouchAction';
var TAP_DISTANCE = 25;
var TRACK_DISTANCE = 5;
var TRACK_LENGTH = 2;
var MOUSE_TIMEOUT = 2500;
var MOUSE_EVENTS = [
'mousedown',
'mousemove',
'mouseup',
'click'
];
var MOUSE_WHICH_TO_BUTTONS = [
0,
1,
4,
2
];
var MOUSE_HAS_BUTTONS = function () {
try {
return new MouseEvent('test', { buttons: 1 }).buttons === 1;
} catch (e) {
return false;
}
}();
var IS_TOUCH_ONLY = navigator.userAgent.match(/iP(?:[oa]d|hone)|Android/);
var mouseCanceller = function (mouseEvent) {
mouseEvent[HANDLED_OBJ] = { skip: true };
if (mouseEvent.type === 'click') {
var path = Polymer.dom(mouseEvent).path;
for (var i = 0; i < path.length; i++) {
if (path[i] === POINTERSTATE.mouse.target) {
return;
}
}
mouseEvent.preventDefault();
mouseEvent.stopPropagation();
}
};
function setupTeardownMouseCanceller(setup) {
for (var i = 0, en; i < MOUSE_EVENTS.length; i++) {
en = MOUSE_EVENTS[i];
if (setup) {
document.addEventListener(en, mouseCanceller, true);
} else {
document.removeEventListener(en, mouseCanceller, true);
}
}
}
function ignoreMouse() {
if (IS_TOUCH_ONLY) {
return;
}
if (!POINTERSTATE.mouse.mouseIgnoreJob) {
setupTeardownMouseCanceller(true);
}
var unset = function () {
setupTeardownMouseCanceller();
POINTERSTATE.mouse.target = null;
POINTERSTATE.mouse.mouseIgnoreJob = null;
};
POINTERSTATE.mouse.mouseIgnoreJob = Polymer.Debounce(POINTERSTATE.mouse.mouseIgnoreJob, unset, MOUSE_TIMEOUT);
}
function hasLeftMouseButton(ev) {
var type = ev.type;
if (MOUSE_EVENTS.indexOf(type) === -1) {
return false;
}
if (type === 'mousemove') {
var buttons = ev.buttons === undefined ? 1 : ev.buttons;
if (ev instanceof window.MouseEvent && !MOUSE_HAS_BUTTONS) {
buttons = MOUSE_WHICH_TO_BUTTONS[ev.which] || 0;
}
return Boolean(buttons & 1);
} else {
var button = ev.button === undefined ? 0 : ev.button;
return button === 0;
}
}
function isSyntheticClick(ev) {
if (ev.type === 'click') {
if (ev.detail === 0) {
return true;
}
var t = Gestures.findOriginalTarget(ev);
var bcr = t.getBoundingClientRect();
var x = ev.pageX, y = ev.pageY;
return !(x >= bcr.left && x <= bcr.right && (y >= bcr.top && y <= bcr.bottom));
}
return false;
}
var POINTERSTATE = {
mouse: {
target: null,
mouseIgnoreJob: null
},
touch: {
x: 0,
y: 0,
id: -1,
scrollDecided: false
}
};
function firstTouchAction(ev) {
var path = Polymer.dom(ev).path;
var ta = 'auto';
for (var i = 0, n; i < path.length; i++) {
n = path[i];
if (n[TOUCH_ACTION]) {
ta = n[TOUCH_ACTION];
break;
}
}
return ta;
}
function trackDocument(stateObj, movefn, upfn) {
stateObj.movefn = movefn;
stateObj.upfn = upfn;
document.addEventListener('mousemove', movefn);
document.addEventListener('mouseup', upfn);
}
function untrackDocument(stateObj) {
document.removeEventListener('mousemove', stateObj.movefn);
document.removeEventListener('mouseup', stateObj.upfn);
}
var Gestures = {
gestures: {},
recognizers: [],
deepTargetFind: function (x, y) {
var node = document.elementFromPoint(x, y);
var next = node;
while (next && next.shadowRoot) {
next = next.shadowRoot.elementFromPoint(x, y);
if (next) {
node = next;
}
}
return node;
},
findOriginalTarget: function (ev) {
if (ev.path) {
return ev.path[0];
}
return ev.target;
},
handleNative: function (ev) {
var handled;
var type = ev.type;
var node = ev.currentTarget;
var gobj = node[GESTURE_KEY];
var gs = gobj[type];
if (!gs) {
return;
}
if (!ev[HANDLED_OBJ]) {
ev[HANDLED_OBJ] = {};
if (type.slice(0, 5) === 'touch') {
var t = ev.changedTouches[0];
if (type === 'touchstart') {
if (ev.touches.length === 1) {
POINTERSTATE.touch.id = t.identifier;
}
}
if (POINTERSTATE.touch.id !== t.identifier) {
return;
}
if (!HAS_NATIVE_TA) {
if (type === 'touchstart' || type === 'touchmove') {
Gestures.handleTouchAction(ev);
}
}
if (type === 'touchend') {
POINTERSTATE.mouse.target = Polymer.dom(ev).rootTarget;
ignoreMouse(true);
}
}
}
handled = ev[HANDLED_OBJ];
if (handled.skip) {
return;
}
var recognizers = Gestures.recognizers;
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
if (r.flow && r.flow.start.indexOf(ev.type) > -1) {
if (r.reset) {
r.reset();
}
}
}
}
for (var i = 0, r; i < recognizers.length; i++) {
r = recognizers[i];
if (gs[r.name] && !handled[r.name]) {
handled[r.name] = true;
r[type](ev);
}
}
},
handleTouchAction: function (ev) {
var t = ev.changedTouches[0];
var type = ev.type;
if (type === 'touchstart') {
POINTERSTATE.touch.x = t.clientX;
POINTERSTATE.touch.y = t.clientY;
POINTERSTATE.touch.scrollDecided = false;
} else if (type === 'touchmove') {
if (POINTERSTATE.touch.scrollDecided) {
return;
}
POINTERSTATE.touch.scrollDecided = true;
var ta = firstTouchAction(ev);
var prevent = false;
var dx = Math.abs(POINTERSTATE.touch.x - t.clientX);
var dy = Math.abs(POINTERSTATE.touch.y - t.clientY);
if (!ev.cancelable) {
} else if (ta === 'none') {
prevent = true;
} else if (ta === 'pan-x') {
prevent = dy > dx;
} else if (ta === 'pan-y') {
prevent = dx > dy;
}
if (prevent) {
ev.preventDefault();
} else {
Gestures.prevent('track');
}
}
},
add: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (!gobj) {
node[GESTURE_KEY] = gobj = {};
}
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
if (IS_TOUCH_ONLY && MOUSE_EVENTS.indexOf(dep) > -1) {
continue;
}
gd = gobj[dep];
if (!gd) {
gobj[dep] = gd = { _count: 0 };
}
if (gd._count === 0) {
node.addEventListener(dep, this.handleNative);
}
gd[name] = (gd[name] || 0) + 1;
gd._count = (gd._count || 0) + 1;
}
node.addEventListener(evType, handler);
if (recognizer.touchAction) {
this.setTouchAction(node, recognizer.touchAction);
}
},
remove: function (node, evType, handler) {
var recognizer = this.gestures[evType];
var deps = recognizer.deps;
var name = recognizer.name;
var gobj = node[GESTURE_KEY];
if (gobj) {
for (var i = 0, dep, gd; i < deps.length; i++) {
dep = deps[i];
gd = gobj[dep];
if (gd && gd[name]) {
gd[name] = (gd[name] || 1) - 1;
gd._count = (gd._count || 1) - 1;
if (gd._count === 0) {
node.removeEventListener(dep, this.handleNative);
}
}
}
}
node.removeEventListener(evType, handler);
},
register: function (recog) {
this.recognizers.push(recog);
for (var i = 0; i < recog.emits.length; i++) {
this.gestures[recog.emits[i]] = recog;
}
},
findRecognizerByEvent: function (evName) {
for (var i = 0, r; i < this.recognizers.length; i++) {
r = this.recognizers[i];
for (var j = 0, n; j < r.emits.length; j++) {
n = r.emits[j];
if (n === evName) {
return r;
}
}
}
return null;
},
setTouchAction: function (node, value) {
if (HAS_NATIVE_TA) {
node.style.touchAction = value;
}
node[TOUCH_ACTION] = value;
},
fire: function (target, type, detail) {
var ev = Polymer.Base.fire(type, detail, {
node: target,
bubbles: true,
cancelable: true
});
if (ev.defaultPrevented) {
var se = detail.sourceEvent;
if (se && se.preventDefault) {
se.preventDefault();
}
}
},
prevent: function (evName) {
var recognizer = this.findRecognizerByEvent(evName);
if (recognizer.info) {
recognizer.info.prevent = true;
}
}
};
Gestures.register({
name: 'downup',
deps: [
'mousedown',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: [
'down',
'up'
],
info: {
movefn: function () {
},
upfn: function () {
}
},
reset: function () {
untrackDocument(this.info);
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
if (!hasLeftMouseButton(e)) {
self.fire('up', t, e);
untrackDocument(self.info);
}
};
var upfn = function upfn(e) {
if (hasLeftMouseButton(e)) {
self.fire('up', t, e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.fire('down', t, e);
},
touchstart: function (e) {
this.fire('down', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
touchend: function (e) {
this.fire('up', Gestures.findOriginalTarget(e), e.changedTouches[0]);
},
fire: function (type, target, event) {
var self = this;
Gestures.fire(target, type, {
x: event.clientX,
y: event.clientY,
sourceEvent: event,
prevent: Gestures.prevent.bind(Gestures)
});
}
});
Gestures.register({
name: 'track',
touchAction: 'none',
deps: [
'mousedown',
'touchstart',
'touchmove',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'mouseup',
'touchend'
]
},
emits: ['track'],
info: {
x: 0,
y: 0,
state: 'start',
started: false,
moves: [],
addMove: function (move) {
if (this.moves.length > TRACK_LENGTH) {
this.moves.shift();
}
this.moves.push(move);
},
movefn: function () {
},
upfn: function () {
},
prevent: false
},
reset: function () {
this.info.state = 'start';
this.info.started = false;
this.info.moves = [];
this.info.x = 0;
this.info.y = 0;
this.info.prevent = false;
untrackDocument(this.info);
},
hasMovedEnough: function (x, y) {
if (this.info.prevent) {
return false;
}
if (this.info.started) {
return true;
}
var dx = Math.abs(this.info.x - x);
var dy = Math.abs(this.info.y - y);
return dx >= TRACK_DISTANCE || dy >= TRACK_DISTANCE;
},
mousedown: function (e) {
if (!hasLeftMouseButton(e)) {
return;
}
var t = Gestures.findOriginalTarget(e);
var self = this;
var movefn = function movefn(e) {
var x = e.clientX, y = e.clientY;
if (self.hasMovedEnough(x, y)) {
self.info.state = self.info.started ? e.type === 'mouseup' ? 'end' : 'track' : 'start';
self.info.addMove({
x: x,
y: y
});
if (!hasLeftMouseButton(e)) {
self.info.state = 'end';
untrackDocument(self.info);
}
self.fire(t, e);
self.info.started = true;
}
};
var upfn = function upfn(e) {
if (self.info.started) {
Gestures.prevent('tap');
movefn(e);
}
untrackDocument(self.info);
};
trackDocument(this.info, movefn, upfn);
this.info.x = e.clientX;
this.info.y = e.clientY;
},
touchstart: function (e) {
var ct = e.changedTouches[0];
this.info.x = ct.clientX;
this.info.y = ct.clientY;
},
touchmove: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
var x = ct.clientX, y = ct.clientY;
if (this.hasMovedEnough(x, y)) {
this.info.addMove({
x: x,
y: y
});
this.fire(t, ct);
this.info.state = 'track';
this.info.started = true;
}
},
touchend: function (e) {
var t = Gestures.findOriginalTarget(e);
var ct = e.changedTouches[0];
if (this.info.started) {
Gestures.prevent('tap');
this.info.state = 'end';
this.info.addMove({
x: ct.clientX,
y: ct.clientY
});
this.fire(t, ct);
}
},
fire: function (target, touch) {
var secondlast = this.info.moves[this.info.moves.length - 2];
var lastmove = this.info.moves[this.info.moves.length - 1];
var dx = lastmove.x - this.info.x;
var dy = lastmove.y - this.info.y;
var ddx, ddy = 0;
if (secondlast) {
ddx = lastmove.x - secondlast.x;
ddy = lastmove.y - secondlast.y;
}
return Gestures.fire(target, 'track', {
state: this.info.state,
x: touch.clientX,
y: touch.clientY,
dx: dx,
dy: dy,
ddx: ddx,
ddy: ddy,
sourceEvent: touch,
hover: function () {
return Gestures.deepTargetFind(touch.clientX, touch.clientY);
}
});
}
});
Gestures.register({
name: 'tap',
deps: [
'mousedown',
'click',
'touchstart',
'touchend'
],
flow: {
start: [
'mousedown',
'touchstart'
],
end: [
'click',
'touchend'
]
},
emits: ['tap'],
info: {
x: NaN,
y: NaN,
prevent: false
},
reset: function () {
this.info.x = NaN;
this.info.y = NaN;
this.info.prevent = false;
},
save: function (e) {
this.info.x = e.clientX;
this.info.y = e.clientY;
},
mousedown: function (e) {
if (hasLeftMouseButton(e)) {
this.save(e);
}
},
click: function (e) {
if (hasLeftMouseButton(e)) {
this.forward(e);
}
},
touchstart: function (e) {
this.save(e.changedTouches[0]);
},
touchend: function (e) {
this.forward(e.changedTouches[0]);
},
forward: function (e) {
var dx = Math.abs(e.clientX - this.info.x);
var dy = Math.abs(e.clientY - this.info.y);
var t = Gestures.findOriginalTarget(e);
if (isNaN(dx) || isNaN(dy) || dx <= TAP_DISTANCE && dy <= TAP_DISTANCE || isSyntheticClick(e)) {
if (!this.info.prevent) {
Gestures.fire(t, 'tap', {
x: e.clientX,
y: e.clientY,
sourceEvent: e
});
}
}
}
});
var DIRECTION_MAP = {
x: 'pan-x',
y: 'pan-y',
none: 'none',
all: 'auto'
};
Polymer.Base._addFeature({
_listen: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.add(node, eventName, handler);
} else {
node.addEventListener(eventName, handler);
}
},
_unlisten: function (node, eventName, handler) {
if (Gestures.gestures[eventName]) {
Gestures.remove(node, eventName, handler);
} else {
node.removeEventListener(eventName, handler);
}
},
setScrollDirection: function (direction, node) {
node = node || this;
Gestures.setTouchAction(node, DIRECTION_MAP[direction] || 'auto');
}
});
Polymer.Gestures = Gestures;
}());
Polymer.Async = {
_currVal: 0,
_lastVal: 0,
_callbacks: [],
_twiddleContent: 0,
_twiddle: document.createTextNode(''),
run: function (callback, waitTime) {
if (waitTime > 0) {
return ~setTimeout(callback, waitTime);
} else {
this._twiddle.textContent = this._twiddleContent++;
this._callbacks.push(callback);
return this._currVal++;
}
},
cancel: function (handle) {
if (handle < 0) {
clearTimeout(~handle);
} else {
var idx = handle - this._lastVal;
if (idx >= 0) {
if (!this._callbacks[idx]) {
throw 'invalid async handle: ' + handle;
}
this._callbacks[idx] = null;
}
}
},
_atEndOfMicrotask: function () {
var len = this._callbacks.length;
for (var i = 0; i < len; i++) {
var cb = this._callbacks[i];
if (cb) {
try {
cb();
} catch (e) {
i++;
this._callbacks.splice(0, i);
this._lastVal += i;
this._twiddle.textContent = this._twiddleContent++;
throw e;
}
}
}
this._callbacks.splice(0, len);
this._lastVal += len;
}
};
new (window.MutationObserver || JsMutationObserver)(Polymer.Async._atEndOfMicrotask.bind(Polymer.Async)).observe(Polymer.Async._twiddle, { characterData: true });
Polymer.Debounce = function () {
var Async = Polymer.Async;
var Debouncer = function (context) {
this.context = context;
this.boundComplete = this.complete.bind(this);
};
Debouncer.prototype = {
go: function (callback, wait) {
var h;
this.finish = function () {
Async.cancel(h);
};
h = Async.run(this.boundComplete, wait);
this.callback = callback;
},
stop: function () {
if (this.finish) {
this.finish();
this.finish = null;
}
},
complete: function () {
if (this.finish) {
this.stop();
this.callback.call(this.context);
}
}
};
function debounce(debouncer, callback, wait) {
if (debouncer) {
debouncer.stop();
} else {
debouncer = new Debouncer(this);
}
debouncer.go(callback, wait);
return debouncer;
}
return debounce;
}();
Polymer.Base._addFeature({
$$: function (slctr) {
return Polymer.dom(this.root).querySelector(slctr);
},
toggleClass: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.classList.contains(name);
}
if (bool) {
Polymer.dom(node).classList.add(name);
} else {
Polymer.dom(node).classList.remove(name);
}
},
toggleAttribute: function (name, bool, node) {
node = node || this;
if (arguments.length == 1) {
bool = !node.hasAttribute(name);
}
if (bool) {
Polymer.dom(node).setAttribute(name, '');
} else {
Polymer.dom(node).removeAttribute(name);
}
},
classFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).classList.remove(name);
}
if (toElement) {
Polymer.dom(toElement).classList.add(name);
}
},
attributeFollows: function (name, toElement, fromElement) {
if (fromElement) {
Polymer.dom(fromElement).removeAttribute(name);
}
if (toElement) {
Polymer.dom(toElement).setAttribute(name, '');
}
},
getContentChildNodes: function (slctr) {
var content = Polymer.dom(this.root).querySelector(slctr || 'content');
return content ? Polymer.dom(content).getDistributedNodes() : [];
},
getContentChildren: function (slctr) {
return this.getContentChildNodes(slctr).filter(function (n) {
return n.nodeType === Node.ELEMENT_NODE;
});
},
fire: function (type, detail, options) {
options = options || Polymer.nob;
var node = options.node || this;
var detail = detail === null || detail === undefined ? Polymer.nob : detail;
var bubbles = options.bubbles === undefined ? true : options.bubbles;
var cancelable = Boolean(options.cancelable);
var event = new CustomEvent(type, {
bubbles: Boolean(bubbles),
cancelable: cancelable,
detail: detail
});
node.dispatchEvent(event);
return event;
},
async: function (callback, waitTime) {
return Polymer.Async.run(callback.bind(this), waitTime);
},
cancelAsync: function (handle) {
Polymer.Async.cancel(handle);
},
arrayDelete: function (path, item) {
var index;
if (Array.isArray(path)) {
index = path.indexOf(item);
if (index >= 0) {
return path.splice(index, 1);
}
} else {
var arr = this.get(path);
index = arr.indexOf(item);
if (index >= 0) {
return this.splice(path, index, 1);
}
}
},
transform: function (transform, node) {
node = node || this;
node.style.webkitTransform = transform;
node.style.transform = transform;
},
translate3d: function (x, y, z, node) {
node = node || this;
this.transform('translate3d(' + x + ',' + y + ',' + z + ')', node);
},
importHref: function (href, onload, onerror) {
var l = document.createElement('link');
l.rel = 'import';
l.href = href;
if (onload) {
l.onload = onload.bind(this);
}
if (onerror) {
l.onerror = onerror.bind(this);
}
document.head.appendChild(l);
return l;
},
create: function (tag, props) {
var elt = document.createElement(tag);
if (props) {
for (var n in props) {
elt[n] = props[n];
}
}
return elt;
},
isLightDescendant: function (node) {
return this.contains(node) && Polymer.dom(this).getOwnerRoot() === Polymer.dom(node).getOwnerRoot();
},
isLocalDescendant: function (node) {
return this.root === Polymer.dom(node).getOwnerRoot();
}
});
Polymer.Bind = {
prepareModel: function (model) {
model._propertyEffects = {};
model._bindListeners = [];
Polymer.Base.mixin(model, this._modelApi);
},
_modelApi: {
_notifyChange: function (property) {
var eventName = Polymer.CaseMap.camelToDashCase(property) + '-changed';
Polymer.Base.fire(eventName, { value: this[property] }, {
bubbles: false,
node: this
});
},
_propertySetter: function (property, value, effects, fromAbove) {
var old = this.__data__[property];
if (old !== value && (old === old || value === value)) {
this.__data__[property] = value;
if (typeof value == 'object') {
this._clearPath(property);
}
if (this._propertyChanged) {
this._propertyChanged(property, value, old);
}
if (effects) {
this._effectEffects(property, value, effects, old, fromAbove);
}
}
return old;
},
__setProperty: function (property, value, quiet, node) {
node = node || this;
var effects = node._propertyEffects && node._propertyEffects[property];
if (effects) {
node._propertySetter(property, value, effects, quiet);
} else {
node[property] = value;
}
},
_effectEffects: function (property, value, effects, old, fromAbove) {
effects.forEach(function (fx) {
var fn = Polymer.Bind['_' + fx.kind + 'Effect'];
if (fn) {
fn.call(this, property, value, fx.effect, old, fromAbove);
}
}, this);
},
_clearPath: function (path) {
for (var prop in this.__data__) {
if (prop.indexOf(path + '.') === 0) {
this.__data__[prop] = undefined;
}
}
}
},
ensurePropertyEffects: function (model, property) {
var fx = model._propertyEffects[property];
if (!fx) {
fx = model._propertyEffects[property] = [];
}
return fx;
},
addPropertyEffect: function (model, property, kind, effect) {
var fx = this.ensurePropertyEffects(model, property);
fx.push({
kind: kind,
effect: effect
});
},
createBindings: function (model) {
var fx$ = model._propertyEffects;
if (fx$) {
for (var n in fx$) {
var fx = fx$[n];
fx.sort(this._sortPropertyEffects);
this._createAccessors(model, n, fx);
}
}
},
_sortPropertyEffects: function () {
var EFFECT_ORDER = {
'compute': 0,
'annotation': 1,
'computedAnnotation': 2,
'reflect': 3,
'notify': 4,
'observer': 5,
'complexObserver': 6,
'function': 7
};
return function (a, b) {
return EFFECT_ORDER[a.kind] - EFFECT_ORDER[b.kind];
};
}(),
_createAccessors: function (model, property, effects) {
var defun = {
get: function () {
return this.__data__[property];
}
};
var setter = function (value) {
this._propertySetter(property, value, effects);
};
var info = model.getPropertyInfo && model.getPropertyInfo(property);
if (info && info.readOnly) {
if (!info.computed) {
model['_set' + this.upper(property)] = setter;
}
} else {
defun.set = setter;
}
Object.defineProperty(model, property, defun);
},
upper: function (name) {
return name[0].toUpperCase() + name.substring(1);
},
_addAnnotatedListener: function (model, index, property, path, event) {
var fn = this._notedListenerFactory(property, path, this._isStructured(path), this._isEventBogus);
var eventName = event || Polymer.CaseMap.camelToDashCase(property) + '-changed';
model._bindListeners.push({
index: index,
property: property,
path: path,
changedFn: fn,
event: eventName
});
},
_isStructured: function (path) {
return path.indexOf('.') > 0;
},
_isEventBogus: function (e, target) {
return e.path && e.path[0] !== target;
},
_notedListenerFactory: function (property, path, isStructured, bogusTest) {
return function (e, target) {
if (!bogusTest(e, target)) {
if (e.detail && e.detail.path) {
this.notifyPath(this._fixPath(path, property, e.detail.path), e.detail.value);
} else {
var value = target[property];
if (!isStructured) {
this[path] = target[property];
} else {
if (this.__data__[path] != value) {
this.set(path, value);
}
}
}
}
};
},
prepareInstance: function (inst) {
inst.__data__ = Object.create(null);
},
setupBindListeners: function (inst) {
inst._bindListeners.forEach(function (info) {
var node = inst._nodes[info.index];
node.addEventListener(info.event, inst._notifyListener.bind(inst, info.changedFn));
});
}
};
Polymer.Base.extend(Polymer.Bind, {
_shouldAddListener: function (effect) {
return effect.name && effect.mode === '{' && !effect.negate && effect.kind != 'attribute';
},
_annotationEffect: function (source, value, effect) {
if (source != effect.value) {
value = this.get(effect.value);
this.__data__[effect.value] = value;
}
var calc = effect.negate ? !value : value;
if (!effect.customEvent || this._nodes[effect.index][effect.name] !== calc) {
return this._applyEffectValue(calc, effect);
}
},
_reflectEffect: function (source) {
this.reflectPropertyToAttribute(source);
},
_notifyEffect: function (source, value, effect, old, fromAbove) {
if (!fromAbove) {
this._notifyChange(source);
}
},
_functionEffect: function (source, value, fn, old, fromAbove) {
fn.call(this, source, value, old, fromAbove);
},
_observerEffect: function (source, value, effect, old) {
var fn = this[effect.method];
if (fn) {
fn.call(this, value, old);
} else {
this._warn(this._logf('_observerEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_complexObserverEffect: function (source, value, effect) {
var fn = this[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
fn.apply(this, args);
}
} else {
this._warn(this._logf('_complexObserverEffect', 'observer method `' + effect.method + '` not defined'));
}
},
_computeEffect: function (source, value, effect) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var fn = this[effect.method];
if (fn) {
this.__setProperty(effect.property, fn.apply(this, args));
} else {
this._warn(this._logf('_computeEffect', 'compute method `' + effect.method + '` not defined'));
}
}
},
_annotatedComputationEffect: function (source, value, effect) {
var computedHost = this._rootDataHost || this;
var fn = computedHost[effect.method];
if (fn) {
var args = Polymer.Bind._marshalArgs(this.__data__, effect, source, value);
if (args) {
var computedvalue = fn.apply(computedHost, args);
if (effect.negate) {
computedvalue = !computedvalue;
}
this._applyEffectValue(computedvalue, effect);
}
} else {
computedHost._warn(computedHost._logf('_annotatedComputationEffect', 'compute method `' + effect.method + '` not defined'));
}
},
_marshalArgs: function (model, effect, path, value) {
var values = [];
var args = effect.args;
for (var i = 0, l = args.length; i < l; i++) {
var arg = args[i];
var name = arg.name;
var v;
if (arg.literal) {
v = arg.value;
} else if (arg.structured) {
v = Polymer.Base.get(name, model);
} else {
v = model[name];
}
if (args.length > 1 && v === undefined) {
return;
}
if (arg.wildcard) {
var baseChanged = name.indexOf(path + '.') === 0;
var matches = effect.trigger.name.indexOf(name) === 0 && !baseChanged;
values[i] = {
path: matches ? path : name,
value: matches ? value : v,
base: v
};
} else {
values[i] = v;
}
}
return values;
}
});
Polymer.Base._addFeature({
_addPropertyEffect: function (property, kind, effect) {
Polymer.Bind.addPropertyEffect(this, property, kind, effect);
},
_prepEffects: function () {
Polymer.Bind.prepareModel(this);
this._addAnnotationEffects(this._notes);
},
_prepBindings: function () {
Polymer.Bind.createBindings(this);
},
_addPropertyEffects: function (properties) {
if (properties) {
for (var p in properties) {
var prop = properties[p];
if (prop.observer) {
this._addObserverEffect(p, prop.observer);
}
if (prop.computed) {
prop.readOnly = true;
this._addComputedEffect(p, prop.computed);
}
if (prop.notify) {
this._addPropertyEffect(p, 'notify');
}
if (prop.reflectToAttribute) {
this._addPropertyEffect(p, 'reflect');
}
if (prop.readOnly) {
Polymer.Bind.ensurePropertyEffects(this, p);
}
}
}
},
_addComputedEffect: function (name, expression) {
var sig = this._parseMethod(expression);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'compute', {
method: sig.method,
args: sig.args,
trigger: arg,
property: name
});
}, this);
},
_addObserverEffect: function (property, observer) {
this._addPropertyEffect(property, 'observer', {
method: observer,
property: property
});
},
_addComplexObserverEffects: function (observers) {
if (observers) {
observers.forEach(function (observer) {
this._addComplexObserverEffect(observer);
}, this);
}
},
_addComplexObserverEffect: function (observer) {
var sig = this._parseMethod(observer);
sig.args.forEach(function (arg) {
this._addPropertyEffect(arg.model, 'complexObserver', {
method: sig.method,
args: sig.args,
trigger: arg
});
}, this);
},
_addAnnotationEffects: function (notes) {
this._nodes = [];
notes.forEach(function (note) {
var index = this._nodes.push(note) - 1;
note.bindings.forEach(function (binding) {
this._addAnnotationEffect(binding, index);
}, this);
}, this);
},
_addAnnotationEffect: function (note, index) {
if (Polymer.Bind._shouldAddListener(note)) {
Polymer.Bind._addAnnotatedListener(this, index, note.name, note.value, note.event);
}
if (note.signature) {
this._addAnnotatedComputationEffect(note, index);
} else {
note.index = index;
this._addPropertyEffect(note.model, 'annotation', note);
}
},
_addAnnotatedComputationEffect: function (note, index) {
var sig = note.signature;
if (sig.static) {
this.__addAnnotatedComputationEffect('__static__', index, note, sig, null);
} else {
sig.args.forEach(function (arg) {
if (!arg.literal) {
this.__addAnnotatedComputationEffect(arg.model, index, note, sig, arg);
}
}, this);
}
},
__addAnnotatedComputationEffect: function (property, index, note, sig, trigger) {
this._addPropertyEffect(property, 'annotatedComputation', {
index: index,
kind: note.kind,
property: note.name,
negate: note.negate,
method: sig.method,
args: sig.args,
trigger: trigger
});
},
_parseMethod: function (expression) {
var m = expression.match(/([^\s]+)\((.*)\)/);
if (m) {
var sig = {
method: m[1],
static: true
};
if (m[2].trim()) {
var args = m[2].replace(/\\,/g, '&comma;').split(',');
return this._parseArgs(args, sig);
} else {
sig.args = Polymer.nar;
return sig;
}
}
},
_parseArgs: function (argList, sig) {
sig.args = argList.map(function (rawArg) {
var arg = this._parseArg(rawArg);
if (!arg.literal) {
sig.static = false;
}
return arg;
}, this);
return sig;
},
_parseArg: function (rawArg) {
var arg = rawArg.trim().replace(/&comma;/g, ',').replace(/\\(.)/g, '$1');
var a = {
name: arg,
model: this._modelForPath(arg)
};
var fc = arg[0];
if (fc === '-') {
fc = arg[1];
}
if (fc >= '0' && fc <= '9') {
fc = '#';
}
switch (fc) {
case '\'':
case '"':
a.value = arg.slice(1, -1);
a.literal = true;
break;
case '#':
a.value = Number(arg);
a.literal = true;
break;
}
if (!a.literal) {
a.structured = arg.indexOf('.') > 0;
if (a.structured) {
a.wildcard = arg.slice(-2) == '.*';
if (a.wildcard) {
a.name = arg.slice(0, -2);
}
}
}
return a;
},
_marshalInstanceEffects: function () {
Polymer.Bind.prepareInstance(this);
Polymer.Bind.setupBindListeners(this);
},
_applyEffectValue: function (value, info) {
var node = this._nodes[info.index];
var property = info.property || info.name || 'textContent';
if (info.kind == 'attribute') {
this.serializeValueToAttribute(value, property, node);
} else {
if (property === 'className') {
value = this._scopeElementClass(node, value);
}
if (property === 'textContent' || node.localName == 'input' && property == 'value') {
value = value == undefined ? '' : value;
}
return node[property] = value;
}
},
_executeStaticEffects: function () {
if (this._propertyEffects.__static__) {
this._effectEffects('__static__', null, this._propertyEffects.__static__);
}
}
});
Polymer.Base._addFeature({
_setupConfigure: function (initialConfig) {
this._config = {};
for (var i in initialConfig) {
if (initialConfig[i] !== undefined) {
this._config[i] = initialConfig[i];
}
}
this._handlers = [];
},
_marshalAttributes: function () {
this._takeAttributesToModel(this._config);
},
_attributeChangedImpl: function (name) {
var model = this._clientsReadied ? this : this._config;
this._setAttributeToProperty(model, name);
},
_configValue: function (name, value) {
this._config[name] = value;
},
_beforeClientsReady: function () {
this._configure();
},
_configure: function () {
this._configureAnnotationReferences();
this._aboveConfig = this.mixin({}, this._config);
var config = {};
this.behaviors.forEach(function (b) {
this._configureProperties(b.properties, config);
}, this);
this._configureProperties(this.properties, config);
this._mixinConfigure(config, this._aboveConfig);
this._config = config;
this._distributeConfig(this._config);
},
_configureProperties: function (properties, config) {
for (var i in properties) {
var c = properties[i];
if (c.value !== undefined) {
var value = c.value;
if (typeof value == 'function') {
value = value.call(this, this._config);
}
config[i] = value;
}
}
},
_mixinConfigure: function (a, b) {
for (var prop in b) {
if (!this.getPropertyInfo(prop).readOnly) {
a[prop] = b[prop];
}
}
},
_distributeConfig: function (config) {
var fx$ = this._propertyEffects;
if (fx$) {
for (var p in config) {
var fx = fx$[p];
if (fx) {
for (var i = 0, l = fx.length, x; i < l && (x = fx[i]); i++) {
if (x.kind === 'annotation') {
var node = this._nodes[x.effect.index];
if (node._configValue) {
var value = p === x.effect.value ? config[p] : this.get(x.effect.value, config);
node._configValue(x.effect.name, value);
}
}
}
}
}
}
},
_afterClientsReady: function () {
this._executeStaticEffects();
this._applyConfig(this._config, this._aboveConfig);
this._flushHandlers();
},
_applyConfig: function (config, aboveConfig) {
for (var n in config) {
if (this[n] === undefined) {
this.__setProperty(n, config[n], n in aboveConfig);
}
}
},
_notifyListener: function (fn, e) {
if (!this._clientsReadied) {
this._queueHandler([
fn,
e,
e.target
]);
} else {
return fn.call(this, e, e.target);
}
},
_queueHandler: function (args) {
this._handlers.push(args);
},
_flushHandlers: function () {
var h$ = this._handlers;
for (var i = 0, l = h$.length, h; i < l && (h = h$[i]); i++) {
h[0].call(this, h[1], h[2]);
}
this._handlers = [];
}
});
(function () {
'use strict';
Polymer.Base._addFeature({
notifyPath: function (path, value, fromAbove) {
var old = this._propertySetter(path, value);
if (old !== value && (old === old || value === value)) {
this._pathEffector(path, value);
if (!fromAbove) {
this._notifyPath(path, value);
}
return true;
}
},
_getPathParts: function (path) {
if (Array.isArray(path)) {
var parts = [];
for (var i = 0; i < path.length; i++) {
var args = path[i].toString().split('.');
for (var j = 0; j < args.length; j++) {
parts.push(args[j]);
}
}
return parts;
} else {
return path.toString().split('.');
}
},
set: function (path, value, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var array;
var last = parts[parts.length - 1];
if (parts.length > 1) {
for (var i = 0; i < parts.length - 1; i++) {
var part = parts[i];
prop = prop[part];
if (array && parseInt(part) == part) {
parts[i] = Polymer.Collection.get(array).getKey(prop);
}
if (!prop) {
return;
}
array = Array.isArray(prop) ? prop : null;
}
if (array && parseInt(last) == last) {
var coll = Polymer.Collection.get(array);
var old = prop[last];
var key = coll.getKey(old);
parts[i] = key;
coll.setItem(key, value);
}
prop[last] = value;
if (!root) {
this.notifyPath(parts.join('.'), value);
}
} else {
prop[path] = value;
}
},
get: function (path, root) {
var prop = root || this;
var parts = this._getPathParts(path);
var last = parts.pop();
while (parts.length) {
prop = prop[parts.shift()];
if (!prop) {
return;
}
}
return prop[last];
},
_pathEffector: function (path, value) {
var model = this._modelForPath(path);
var fx$ = this._propertyEffects[model];
if (fx$) {
fx$.forEach(function (fx) {
var fxFn = this['_' + fx.kind + 'PathEffect'];
if (fxFn) {
fxFn.call(this, path, value, fx.effect);
}
}, this);
}
if (this._boundPaths) {
this._notifyBoundPaths(path, value);
}
},
_annotationPathEffect: function (path, value, effect) {
if (effect.value === path || effect.value.indexOf(path + '.') === 0) {
Polymer.Bind._annotationEffect.call(this, path, value, effect);
} else if (path.indexOf(effect.value + '.') === 0 && !effect.negate) {
var node = this._nodes[effect.index];
if (node && node.notifyPath) {
var p = this._fixPath(effect.name, effect.value, path);
node.notifyPath(p, value, true);
}
}
},
_complexObserverPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._complexObserverEffect.call(this, path, value, effect);
}
},
_computePathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._computeEffect.call(this, path, value, effect);
}
},
_annotatedComputationPathEffect: function (path, value, effect) {
if (this._pathMatchesEffect(path, effect)) {
Polymer.Bind._annotatedComputationEffect.call(this, path, value, effect);
}
},
_pathMatchesEffect: function (path, effect) {
var effectArg = effect.trigger.name;
return effectArg == path || effectArg.indexOf(path + '.') === 0 || effect.trigger.wildcard && path.indexOf(effectArg) === 0;
},
linkPaths: function (to, from) {
this._boundPaths = this._boundPaths || {};
if (from) {
this._boundPaths[to] = from;
} else {
this.unlinkPaths(to);
}
},
unlinkPaths: function (path) {
if (this._boundPaths) {
delete this._boundPaths[path];
}
},
_notifyBoundPaths: function (path, value) {
for (var a in this._boundPaths) {
var b = this._boundPaths[a];
if (path.indexOf(a + '.') == 0) {
this.notifyPath(this._fixPath(b, a, path), value);
} else if (path.indexOf(b + '.') == 0) {
this.notifyPath(this._fixPath(a, b, path), value);
}
}
},
_fixPath: function (property, root, path) {
return property + path.slice(root.length);
},
_notifyPath: function (path, value) {
var rootName = this._modelForPath(path);
var dashCaseName = Polymer.CaseMap.camelToDashCase(rootName);
var eventName = dashCaseName + this._EVENT_CHANGED;
this.fire(eventName, {
path: path,
value: value
}, { bubbles: false });
},
_modelForPath: function (path) {
var dot = path.indexOf('.');
return dot < 0 ? path : path.slice(0, dot);
},
_EVENT_CHANGED: '-changed',
_notifySplice: function (array, path, index, added, removed) {
var splices = [{
index: index,
addedCount: added,
removed: removed,
object: array,
type: 'splice'
}];
var change = {
keySplices: Polymer.Collection.applySplices(array, splices),
indexSplices: splices
};
this.set(path + '.splices', change);
if (added != removed.length) {
this.notifyPath(path + '.length', array.length);
}
change.keySplices = null;
change.indexSplices = null;
},
push: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var len = array.length;
var ret = array.push.apply(array, args);
if (args.length) {
this._notifySplice(array, path, len, args.length, []);
}
return ret;
},
pop: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.pop.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, array.length, 0, [ret]);
}
return ret;
},
splice: function (path, start, deleteCount) {
var array = this.get(path);
if (start < 0) {
start = array.length - Math.floor(-start);
} else {
start = Math.floor(start);
}
if (!start) {
start = 0;
}
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.splice.apply(array, args);
var addedCount = Math.max(args.length - 2, 0);
if (addedCount || ret.length) {
this._notifySplice(array, path, start, addedCount, ret);
}
return ret;
},
shift: function (path) {
var array = this.get(path);
var hadLength = Boolean(array.length);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.shift.apply(array, args);
if (hadLength) {
this._notifySplice(array, path, 0, 0, [ret]);
}
return ret;
},
unshift: function (path) {
var array = this.get(path);
var args = Array.prototype.slice.call(arguments, 1);
var ret = array.unshift.apply(array, args);
if (args.length) {
this._notifySplice(array, path, 0, args.length, []);
}
return ret;
},
prepareModelNotifyPath: function (model) {
this.mixin(model, {
fire: Polymer.Base.fire,
notifyPath: Polymer.Base.notifyPath,
_EVENT_CHANGED: Polymer.Base._EVENT_CHANGED,
_notifyPath: Polymer.Base._notifyPath,
_pathEffector: Polymer.Base._pathEffector,
_annotationPathEffect: Polymer.Base._annotationPathEffect,
_complexObserverPathEffect: Polymer.Base._complexObserverPathEffect,
_annotatedComputationPathEffect: Polymer.Base._annotatedComputationPathEffect,
_computePathEffect: Polymer.Base._computePathEffect,
_modelForPath: Polymer.Base._modelForPath,
_pathMatchesEffect: Polymer.Base._pathMatchesEffect,
_notifyBoundPaths: Polymer.Base._notifyBoundPaths
});
}
});
}());
Polymer.Base._addFeature({
resolveUrl: function (url) {
var module = Polymer.DomModule.import(this.is);
var root = '';
if (module) {
var assetPath = module.getAttribute('assetpath') || '';
root = Polymer.ResolveUrl.resolveUrl(assetPath, module.ownerDocument.baseURI);
}
return Polymer.ResolveUrl.resolveUrl(url, root);
}
});
Polymer.CssParse = function () {
var api = {
parse: function (text) {
text = this._clean(text);
return this._parseCss(this._lex(text), text);
},
_clean: function (cssText) {
return cssText.replace(this._rx.comments, '').replace(this._rx.port, '');
},
_lex: function (text) {
var root = {
start: 0,
end: text.length
};
var n = root;
for (var i = 0, s = 0, l = text.length; i < l; i++) {
switch (text[i]) {
case this.OPEN_BRACE:
if (!n.rules) {
n.rules = [];
}
var p = n;
var previous = p.rules[p.rules.length - 1];
n = {
start: i + 1,
parent: p,
previous: previous
};
p.rules.push(n);
break;
case this.CLOSE_BRACE:
n.end = i + 1;
n = n.parent || root;
break;
}
}
return root;
},
_parseCss: function (node, text) {
var t = text.substring(node.start, node.end - 1);
node.parsedCssText = node.cssText = t.trim();
if (node.parent) {
var ss = node.previous ? node.previous.end : node.parent.start;
t = text.substring(ss, node.start - 1);
t = t.substring(t.lastIndexOf(';') + 1);
var s = node.parsedSelector = node.selector = t.trim();
node.atRule = s.indexOf(this.AT_START) === 0;
if (node.atRule) {
if (s.indexOf(this.MEDIA_START) === 0) {
node.type = this.types.MEDIA_RULE;
} else if (s.match(this._rx.keyframesRule)) {
node.type = this.types.KEYFRAMES_RULE;
}
} else {
if (s.indexOf(this.VAR_START) === 0) {
node.type = this.types.MIXIN_RULE;
} else {
node.type = this.types.STYLE_RULE;
}
}
}
var r$ = node.rules;
if (r$) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this._parseCss(r, text);
}
}
return node;
},
stringify: function (node, preserveProperties, text) {
text = text || '';
var cssText = '';
if (node.cssText || node.rules) {
var r$ = node.rules;
if (r$ && (preserveProperties || !this._hasMixinRules(r$))) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
cssText = this.stringify(r, preserveProperties, cssText);
}
} else {
cssText = preserveProperties ? node.cssText : this.removeCustomProps(node.cssText);
cssText = cssText.trim();
if (cssText) {
cssText = '  ' + cssText + '\n';
}
}
}
if (cssText) {
if (node.selector) {
text += node.selector + ' ' + this.OPEN_BRACE + '\n';
}
text += cssText;
if (node.selector) {
text += this.CLOSE_BRACE + '\n\n';
}
}
return text;
},
_hasMixinRules: function (rules) {
return rules[0].selector.indexOf(this.VAR_START) >= 0;
},
removeCustomProps: function (cssText) {
cssText = this.removeCustomPropAssignment(cssText);
return this.removeCustomPropApply(cssText);
},
removeCustomPropAssignment: function (cssText) {
return cssText.replace(this._rx.customProp, '').replace(this._rx.mixinProp, '');
},
removeCustomPropApply: function (cssText) {
return cssText.replace(this._rx.mixinApply, '').replace(this._rx.varApply, '');
},
types: {
STYLE_RULE: 1,
KEYFRAMES_RULE: 7,
MEDIA_RULE: 4,
MIXIN_RULE: 1000
},
OPEN_BRACE: '{',
CLOSE_BRACE: '}',
_rx: {
comments: /\/\*[^*]*\*+([^\/*][^*]*\*+)*\//gim,
port: /@import[^;]*;/gim,
customProp: /(?:^|[\s;])--[^;{]*?:[^{};]*?(?:[;\n]|$)/gim,
mixinProp: /(?:^|[\s;])--[^;{]*?:[^{;]*?{[^}]*?}(?:[;\n]|$)?/gim,
mixinApply: /@apply[\s]*\([^)]*?\)[\s]*(?:[;\n]|$)?/gim,
varApply: /[^;:]*?:[^;]*var[^;]*(?:[;\n]|$)?/gim,
keyframesRule: /^@[^\s]*keyframes/
},
VAR_START: '--',
MEDIA_START: '@media',
AT_START: '@'
};
return api;
}();
Polymer.StyleUtil = function () {
return {
MODULE_STYLES_SELECTOR: 'style, link[rel=import][type~=css], template',
INCLUDE_ATTR: 'include',
toCssText: function (rules, callback, preserveProperties) {
if (typeof rules === 'string') {
rules = this.parser.parse(rules);
}
if (callback) {
this.forEachStyleRule(rules, callback);
}
return this.parser.stringify(rules, preserveProperties);
},
forRulesInStyles: function (styles, callback) {
if (styles) {
for (var i = 0, l = styles.length, s; i < l && (s = styles[i]); i++) {
this.forEachStyleRule(this.rulesForStyle(s), callback);
}
}
},
rulesForStyle: function (style) {
if (!style.__cssRules && style.textContent) {
style.__cssRules = this.parser.parse(style.textContent);
}
return style.__cssRules;
},
clearStyleRules: function (style) {
style.__cssRules = null;
},
forEachStyleRule: function (node, callback) {
if (!node) {
return;
}
var s = node.parsedSelector;
var skipRules = false;
if (node.type === this.ruleTypes.STYLE_RULE) {
callback(node);
} else if (node.type === this.ruleTypes.KEYFRAMES_RULE || node.type === this.ruleTypes.MIXIN_RULE) {
skipRules = true;
}
var r$ = node.rules;
if (r$ && !skipRules) {
for (var i = 0, l = r$.length, r; i < l && (r = r$[i]); i++) {
this.forEachStyleRule(r, callback);
}
}
},
applyCss: function (cssText, moniker, target, afterNode) {
var style = document.createElement('style');
if (moniker) {
style.setAttribute('scope', moniker);
}
style.textContent = cssText;
target = target || document.head;
if (!afterNode) {
var n$ = target.querySelectorAll('style[scope]');
afterNode = n$[n$.length - 1];
}
target.insertBefore(style, afterNode && afterNode.nextSibling || target.firstChild);
return style;
},
cssFromModules: function (moduleIds, warnIfNotFound) {
var modules = moduleIds.trim().split(' ');
var cssText = '';
for (var i = 0; i < modules.length; i++) {
cssText += this.cssFromModule(modules[i], warnIfNotFound);
}
return cssText;
},
cssFromModule: function (moduleId, warnIfNotFound) {
var m = Polymer.DomModule.import(moduleId);
if (m && !m._cssText) {
m._cssText = this._cssFromElement(m);
}
if (!m && warnIfNotFound) {
console.warn('Could not find style data in module named', moduleId);
}
return m && m._cssText || '';
},
_cssFromElement: function (element) {
var cssText = '';
var content = element.content || element;
var e$ = Array.prototype.slice.call(content.querySelectorAll(this.MODULE_STYLES_SELECTOR));
for (var i = 0, e; i < e$.length; i++) {
e = e$[i];
if (e.localName === 'template') {
cssText += this._cssFromElement(e);
} else {
if (e.localName === 'style') {
var include = e.getAttribute(this.INCLUDE_ATTR);
if (include) {
cssText += this.cssFromModules(include, true);
}
e = e.__appliedElement || e;
e.parentNode.removeChild(e);
cssText += this.resolveCss(e.textContent, element.ownerDocument);
} else if (e.import && e.import.body) {
cssText += this.resolveCss(e.import.body.textContent, e.import);
}
}
}
return cssText;
},
resolveCss: Polymer.ResolveUrl.resolveCss,
parser: Polymer.CssParse,
ruleTypes: Polymer.CssParse.types
};
}();
Polymer.StyleTransformer = function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var api = {
dom: function (node, scope, useAttr, shouldRemoveScope) {
this._transformDom(node, scope || '', useAttr, shouldRemoveScope);
},
_transformDom: function (node, selector, useAttr, shouldRemoveScope) {
if (node.setAttribute) {
this.element(node, selector, useAttr, shouldRemoveScope);
}
var c$ = Polymer.dom(node).childNodes;
for (var i = 0; i < c$.length; i++) {
this._transformDom(c$[i], selector, useAttr, shouldRemoveScope);
}
},
element: function (element, scope, useAttr, shouldRemoveScope) {
if (useAttr) {
if (shouldRemoveScope) {
element.removeAttribute(SCOPE_NAME);
} else {
element.setAttribute(SCOPE_NAME, scope);
}
} else {
if (scope) {
if (element.classList) {
if (shouldRemoveScope) {
element.classList.remove(SCOPE_NAME);
element.classList.remove(scope);
} else {
element.classList.add(SCOPE_NAME);
element.classList.add(scope);
}
} else if (element.getAttribute) {
var c = element.getAttribute(CLASS);
if (shouldRemoveScope) {
if (c) {
element.setAttribute(CLASS, c.replace(SCOPE_NAME, '').replace(scope, ''));
}
} else {
element.setAttribute(CLASS, c + (c ? ' ' : '') + SCOPE_NAME + ' ' + scope);
}
}
}
}
},
elementStyles: function (element, callback) {
var styles = element._styles;
var cssText = '';
for (var i = 0, l = styles.length, s, text; i < l && (s = styles[i]); i++) {
var rules = styleUtil.rulesForStyle(s);
cssText += nativeShadow ? styleUtil.toCssText(rules, callback) : this.css(rules, element.is, element.extends, callback, element._scopeCssViaAttr) + '\n\n';
}
return cssText.trim();
},
css: function (rules, scope, ext, callback, useAttr) {
var hostScope = this._calcHostScope(scope, ext);
scope = this._calcElementScope(scope, useAttr);
var self = this;
return styleUtil.toCssText(rules, function (rule) {
if (!rule.isScoped) {
self.rule(rule, scope, hostScope);
rule.isScoped = true;
}
if (callback) {
callback(rule, scope, hostScope);
}
});
},
_calcElementScope: function (scope, useAttr) {
if (scope) {
return useAttr ? CSS_ATTR_PREFIX + scope + CSS_ATTR_SUFFIX : CSS_CLASS_PREFIX + scope;
} else {
return '';
}
},
_calcHostScope: function (scope, ext) {
return ext ? '[is=' + scope + ']' : scope;
},
rule: function (rule, scope, hostScope) {
this._transformRule(rule, this._transformComplexSelector, scope, hostScope);
},
_transformRule: function (rule, transformer, scope, hostScope) {
var p$ = rule.selector.split(COMPLEX_SELECTOR_SEP);
for (var i = 0, l = p$.length, p; i < l && (p = p$[i]); i++) {
p$[i] = transformer.call(this, p, scope, hostScope);
}
rule.selector = rule.transformedSelector = p$.join(COMPLEX_SELECTOR_SEP);
},
_transformComplexSelector: function (selector, scope, hostScope) {
var stop = false;
var hostContext = false;
var self = this;
selector = selector.replace(SIMPLE_SELECTOR_SEP, function (m, c, s) {
if (!stop) {
var info = self._transformCompoundSelector(s, c, scope, hostScope);
stop = stop || info.stop;
hostContext = hostContext || info.hostContext;
c = info.combinator;
s = info.value;
} else {
s = s.replace(SCOPE_JUMP, ' ');
}
return c + s;
});
if (hostContext) {
selector = selector.replace(HOST_CONTEXT_PAREN, function (m, pre, paren, post) {
return pre + paren + ' ' + hostScope + post + COMPLEX_SELECTOR_SEP + ' ' + pre + hostScope + paren + post;
});
}
return selector;
},
_transformCompoundSelector: function (selector, combinator, scope, hostScope) {
var jumpIndex = selector.search(SCOPE_JUMP);
var hostContext = false;
if (selector.indexOf(HOST_CONTEXT) >= 0) {
hostContext = true;
} else if (selector.indexOf(HOST) >= 0) {
selector = selector.replace(HOST_PAREN, function (m, host, paren) {
return hostScope + paren;
});
selector = selector.replace(HOST, hostScope);
} else if (jumpIndex !== 0) {
selector = scope ? this._transformSimpleSelector(selector, scope) : selector;
}
if (selector.indexOf(CONTENT) >= 0) {
combinator = '';
}
var stop;
if (jumpIndex >= 0) {
selector = selector.replace(SCOPE_JUMP, ' ');
stop = true;
}
return {
value: selector,
combinator: combinator,
stop: stop,
hostContext: hostContext
};
},
_transformSimpleSelector: function (selector, scope) {
var p$ = selector.split(PSEUDO_PREFIX);
p$[0] += scope;
return p$.join(PSEUDO_PREFIX);
},
documentRule: function (rule) {
rule.selector = rule.parsedSelector;
this.normalizeRootSelector(rule);
if (!nativeShadow) {
this._transformRule(rule, this._transformDocumentSelector);
}
},
normalizeRootSelector: function (rule) {
if (rule.selector === ROOT) {
rule.selector = 'body';
}
},
_transformDocumentSelector: function (selector) {
return selector.match(SCOPE_JUMP) ? this._transformComplexSelector(selector, SCOPE_DOC_SELECTOR) : this._transformSimpleSelector(selector.trim(), SCOPE_DOC_SELECTOR);
},
SCOPE_NAME: 'style-scope'
};
var SCOPE_NAME = api.SCOPE_NAME;
var SCOPE_DOC_SELECTOR = ':not([' + SCOPE_NAME + '])' + ':not(.' + SCOPE_NAME + ')';
var COMPLEX_SELECTOR_SEP = ',';
var SIMPLE_SELECTOR_SEP = /(^|[\s>+~]+)([^\s>+~]+)/g;
var HOST = ':host';
var ROOT = ':root';
var HOST_PAREN = /(\:host)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))/g;
var HOST_CONTEXT = ':host-context';
var HOST_CONTEXT_PAREN = /(.*)(?:\:host-context)(?:\(((?:\([^)(]*\)|[^)(]*)+?)\))(.*)/;
var CONTENT = '::content';
var SCOPE_JUMP = /\:\:content|\:\:shadow|\/deep\//;
var CSS_CLASS_PREFIX = '.';
var CSS_ATTR_PREFIX = '[' + SCOPE_NAME + '~=';
var CSS_ATTR_SUFFIX = ']';
var PSEUDO_PREFIX = ':';
var CLASS = 'class';
return api;
}();
Polymer.StyleExtends = function () {
var styleUtil = Polymer.StyleUtil;
return {
hasExtends: function (cssText) {
return Boolean(cssText.match(this.rx.EXTEND));
},
transform: function (style) {
var rules = styleUtil.rulesForStyle(style);
var self = this;
styleUtil.forEachStyleRule(rules, function (rule) {
var map = self._mapRule(rule);
if (rule.parent) {
var m;
while (m = self.rx.EXTEND.exec(rule.cssText)) {
var extend = m[1];
var extendor = self._findExtendor(extend, rule);
if (extendor) {
self._extendRule(rule, extendor);
}
}
}
rule.cssText = rule.cssText.replace(self.rx.EXTEND, '');
});
return styleUtil.toCssText(rules, function (rule) {
if (rule.selector.match(self.rx.STRIP)) {
rule.cssText = '';
}
}, true);
},
_mapRule: function (rule) {
if (rule.parent) {
var map = rule.parent.map || (rule.parent.map = {});
var parts = rule.selector.split(',');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
map[p.trim()] = rule;
}
return map;
}
},
_findExtendor: function (extend, rule) {
return rule.parent && rule.parent.map && rule.parent.map[extend] || this._findExtendor(extend, rule.parent);
},
_extendRule: function (target, source) {
if (target.parent !== source.parent) {
this._cloneAndAddRuleToParent(source, target.parent);
}
target.extends = target.extends || (target.extends = []);
target.extends.push(source);
source.selector = source.selector.replace(this.rx.STRIP, '');
source.selector = (source.selector && source.selector + ',\n') + target.selector;
if (source.extends) {
source.extends.forEach(function (e) {
this._extendRule(target, e);
}, this);
}
},
_cloneAndAddRuleToParent: function (rule, parent) {
rule = Object.create(rule);
rule.parent = parent;
if (rule.extends) {
rule.extends = rule.extends.slice();
}
parent.rules.push(rule);
},
rx: {
EXTEND: /@extends\(([^)]*)\)\s*?;/gim,
STRIP: /%[^,]*$/
}
};
}();
(function () {
var prepElement = Polymer.Base._prepElement;
var nativeShadow = Polymer.Settings.useNativeShadow;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
var styleExtends = Polymer.StyleExtends;
Polymer.Base._addFeature({
_prepElement: function (element) {
if (this._encapsulateStyle) {
styleTransformer.element(element, this.is, this._scopeCssViaAttr);
}
prepElement.call(this, element);
},
_prepStyles: function () {
if (this._encapsulateStyle === undefined) {
this._encapsulateStyle = !nativeShadow && Boolean(this._template);
}
this._styles = this._collectStyles();
var cssText = styleTransformer.elementStyles(this);
if (cssText && this._template) {
var style = styleUtil.applyCss(cssText, this.is, nativeShadow ? this._template.content : null);
if (!nativeShadow) {
this._scopeStyle = style;
}
}
},
_collectStyles: function () {
var styles = [];
var cssText = '', m$ = this.styleModules;
if (m$) {
for (var i = 0, l = m$.length, m; i < l && (m = m$[i]); i++) {
cssText += styleUtil.cssFromModule(m);
}
}
cssText += styleUtil.cssFromModule(this.is);
if (cssText) {
var style = document.createElement('style');
style.textContent = cssText;
if (styleExtends.hasExtends(style.textContent)) {
cssText = styleExtends.transform(style);
}
styles.push(style);
}
return styles;
},
_elementAdd: function (node) {
if (this._encapsulateStyle) {
if (node.__styleScoped) {
node.__styleScoped = false;
} else {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr);
}
}
},
_elementRemove: function (node) {
if (this._encapsulateStyle) {
styleTransformer.dom(node, this.is, this._scopeCssViaAttr, true);
}
},
scopeSubtree: function (container, shouldObserve) {
if (nativeShadow) {
return;
}
var self = this;
var scopify = function (node) {
if (node.nodeType === Node.ELEMENT_NODE) {
node.className = self._scopeElementClass(node, node.className);
var n$ = node.querySelectorAll('*');
Array.prototype.forEach.call(n$, function (n) {
n.className = self._scopeElementClass(n, n.className);
});
}
};
scopify(container);
if (shouldObserve) {
var mo = new MutationObserver(function (mxns) {
mxns.forEach(function (m) {
if (m.addedNodes) {
for (var i = 0; i < m.addedNodes.length; i++) {
scopify(m.addedNodes[i]);
}
}
});
});
mo.observe(container, {
childList: true,
subtree: true
});
return mo;
}
}
});
}());
Polymer.StyleProperties = function () {
'use strict';
var nativeShadow = Polymer.Settings.useNativeShadow;
var matchesSelector = Polymer.DomApi.matchesSelector;
var styleUtil = Polymer.StyleUtil;
var styleTransformer = Polymer.StyleTransformer;
return {
decorateStyles: function (styles) {
var self = this, props = {};
styleUtil.forRulesInStyles(styles, function (rule) {
self.decorateRule(rule);
self.collectPropertiesInCssText(rule.propertyInfo.cssText, props);
});
var names = [];
for (var i in props) {
names.push(i);
}
return names;
},
decorateRule: function (rule) {
if (rule.propertyInfo) {
return rule.propertyInfo;
}
var info = {}, properties = {};
var hasProperties = this.collectProperties(rule, properties);
if (hasProperties) {
info.properties = properties;
rule.rules = null;
}
info.cssText = this.collectCssText(rule);
rule.propertyInfo = info;
return info;
},
collectProperties: function (rule, properties) {
var info = rule.propertyInfo;
if (info) {
if (info.properties) {
Polymer.Base.mixin(properties, info.properties);
return true;
}
} else {
var m, rx = this.rx.VAR_ASSIGN;
var cssText = rule.parsedCssText;
var any;
while (m = rx.exec(cssText)) {
properties[m[1]] = (m[2] || m[3]).trim();
any = true;
}
return any;
}
},
collectCssText: function (rule) {
var customCssText = '';
var cssText = rule.parsedCssText;
cssText = cssText.replace(this.rx.BRACKETED, '').replace(this.rx.VAR_ASSIGN, '');
var parts = cssText.split(';');
for (var i = 0, p; i < parts.length; i++) {
p = parts[i];
if (p.match(this.rx.MIXIN_MATCH) || p.match(this.rx.VAR_MATCH)) {
customCssText += p + ';\n';
}
}
return customCssText;
},
collectPropertiesInCssText: function (cssText, props) {
var m;
while (m = this.rx.VAR_CAPTURE.exec(cssText)) {
props[m[1]] = true;
var def = m[2];
if (def && def.match(this.rx.IS_VAR)) {
props[def] = true;
}
}
},
reify: function (props) {
var names = Object.getOwnPropertyNames(props);
for (var i = 0, n; i < names.length; i++) {
n = names[i];
props[n] = this.valueForProperty(props[n], props);
}
},
valueForProperty: function (property, props) {
if (property) {
if (property.indexOf(';') >= 0) {
property = this.valueForProperties(property, props);
} else {
var self = this;
var fn = function (all, prefix, value, fallback) {
var propertyValue = self.valueForProperty(props[value], props) || (props[fallback] ? self.valueForProperty(props[fallback], props) : fallback);
return prefix + (propertyValue || '');
};
property = property.replace(this.rx.VAR_MATCH, fn);
}
}
return property && property.trim() || '';
},
valueForProperties: function (property, props) {
var parts = property.split(';');
for (var i = 0, p, m; i < parts.length; i++) {
if (p = parts[i]) {
m = p.match(this.rx.MIXIN_MATCH);
if (m) {
p = this.valueForProperty(props[m[1]], props);
} else {
var pp = p.split(':');
if (pp[1]) {
pp[1] = pp[1].trim();
pp[1] = this.valueForProperty(pp[1], props) || pp[1];
}
p = pp.join(':');
}
parts[i] = p && p.lastIndexOf(';') === p.length - 1 ? p.slice(0, -1) : p || '';
}
}
return parts.join(';');
},
applyProperties: function (rule, props) {
var output = '';
if (!rule.propertyInfo) {
this.decorateRule(rule);
}
if (rule.propertyInfo.cssText) {
output = this.valueForProperties(rule.propertyInfo.cssText, props);
}
rule.cssText = output;
},
propertyDataFromStyles: function (styles, element) {
var props = {}, self = this;
var o = [], i = 0;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
if (element && rule.propertyInfo.properties && matchesSelector.call(element, rule.transformedSelector || rule.parsedSelector)) {
self.collectProperties(rule, props);
addToBitMask(i, o);
}
i++;
});
return {
properties: props,
key: o
};
},
scopePropertiesFromStyles: function (styles) {
if (!styles._scopeStyleProperties) {
styles._scopeStyleProperties = this.selectedPropertiesFromStyles(styles, this.SCOPE_SELECTORS);
}
return styles._scopeStyleProperties;
},
hostPropertiesFromStyles: function (styles) {
if (!styles._hostStyleProperties) {
styles._hostStyleProperties = this.selectedPropertiesFromStyles(styles, this.HOST_SELECTORS);
}
return styles._hostStyleProperties;
},
selectedPropertiesFromStyles: function (styles, selectors) {
var props = {}, self = this;
styleUtil.forRulesInStyles(styles, function (rule) {
if (!rule.propertyInfo) {
self.decorateRule(rule);
}
for (var i = 0; i < selectors.length; i++) {
if (rule.parsedSelector === selectors[i]) {
self.collectProperties(rule, props);
return;
}
}
});
return props;
},
transformStyles: function (element, properties, scopeSelector) {
var self = this;
var hostSelector = styleTransformer._calcHostScope(element.is, element.extends);
var rxHostSelector = element.extends ? '\\' + hostSelector.slice(0, -1) + '\\]' : hostSelector;
var hostRx = new RegExp(this.rx.HOST_PREFIX + rxHostSelector + this.rx.HOST_SUFFIX);
return styleTransformer.elementStyles(element, function (rule) {
self.applyProperties(rule, properties);
if (rule.cssText && !nativeShadow) {
self._scopeSelector(rule, hostRx, hostSelector, element._scopeCssViaAttr, scopeSelector);
}
});
},
_scopeSelector: function (rule, hostRx, hostSelector, viaAttr, scopeId) {
rule.transformedSelector = rule.transformedSelector || rule.selector;
var selector = rule.transformedSelector;
var scope = viaAttr ? '[' + styleTransformer.SCOPE_NAME + '~=' + scopeId + ']' : '.' + scopeId;
var parts = selector.split(',');
for (var i = 0, l = parts.length, p; i < l && (p = parts[i]); i++) {
parts[i] = p.match(hostRx) ? p.replace(hostSelector, hostSelector + scope) : scope + ' ' + p;
}
rule.selector = parts.join(',');
},
applyElementScopeSelector: function (element, selector, old, viaAttr) {
var c = viaAttr ? element.getAttribute(styleTransformer.SCOPE_NAME) : element.className;
var v = old ? c.replace(old, selector) : (c ? c + ' ' : '') + this.XSCOPE_NAME + ' ' + selector;
if (c !== v) {
if (viaAttr) {
element.setAttribute(styleTransformer.SCOPE_NAME, v);
} else {
element.className = v;
}
}
},
applyElementStyle: function (element, properties, selector, style) {
var cssText = style ? style.textContent || '' : this.transformStyles(element, properties, selector);
var s = element._customStyle;
if (s && !nativeShadow && s !== style) {
s._useCount--;
if (s._useCount <= 0 && s.parentNode) {
s.parentNode.removeChild(s);
}
}
if (nativeShadow || (!style || !style.parentNode)) {
if (nativeShadow && element._customStyle) {
element._customStyle.textContent = cssText;
style = element._customStyle;
} else if (cssText) {
style = styleUtil.applyCss(cssText, selector, nativeShadow ? element.root : null, element._scopeStyle);
}
}
if (style) {
style._useCount = style._useCount || 0;
if (element._customStyle != style) {
style._useCount++;
}
element._customStyle = style;
}
return style;
},
mixinCustomStyle: function (props, customStyle) {
var v;
for (var i in customStyle) {
v = customStyle[i];
if (v || v === 0) {
props[i] = v;
}
}
},
rx: {
VAR_ASSIGN: /(?:^|[;\n]\s*)(--[\w-]*?):\s*(?:([^;{]*)|{([^}]*)})(?:(?=[;\n])|$)/gi,
MIXIN_MATCH: /(?:^|\W+)@apply[\s]*\(([^)]*)\)/i,
VAR_MATCH: /(^|\W+)var\([\s]*([^,)]*)[\s]*,?[\s]*((?:[^,)]*)|(?:[^;]*\([^;)]*\)))[\s]*?\)/gi,
VAR_CAPTURE: /\([\s]*(--[^,\s)]*)(?:,[\s]*(--[^,\s)]*))?(?:\)|,)/gi,
IS_VAR: /^--/,
BRACKETED: /\{[^}]*\}/g,
HOST_PREFIX: '(?:^|[^.#[:])',
HOST_SUFFIX: '($|[.:[\\s>+~])'
},
HOST_SELECTORS: [':host'],
SCOPE_SELECTORS: [':root'],
XSCOPE_NAME: 'x-scope'
};
function addToBitMask(n, bits) {
var o = parseInt(n / 32);
var v = 1 << n % 32;
bits[o] = (bits[o] || 0) | v;
}
}();
(function () {
Polymer.StyleCache = function () {
this.cache = {};
};
Polymer.StyleCache.prototype = {
MAX: 100,
store: function (is, data, keyValues, keyStyles) {
data.keyValues = keyValues;
data.styles = keyStyles;
var s$ = this.cache[is] = this.cache[is] || [];
s$.push(data);
if (s$.length > this.MAX) {
s$.shift();
}
},
retrieve: function (is, keyValues, keyStyles) {
var cache = this.cache[is];
if (cache) {
for (var i = cache.length - 1, data; i >= 0; i--) {
data = cache[i];
if (keyStyles === data.styles && this._objectsEqual(keyValues, data.keyValues)) {
return data;
}
}
}
},
clear: function () {
this.cache = {};
},
_objectsEqual: function (target, source) {
var t, s;
for (var i in target) {
t = target[i], s = source[i];
if (!(typeof t === 'object' && t ? this._objectsStrictlyEqual(t, s) : t === s)) {
return false;
}
}
if (Array.isArray(target)) {
return target.length === source.length;
}
return true;
},
_objectsStrictlyEqual: function (target, source) {
return this._objectsEqual(target, source) && this._objectsEqual(source, target);
}
};
}());
Polymer.StyleDefaults = function () {
var styleProperties = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var StyleCache = Polymer.StyleCache;
var api = {
_styles: [],
_properties: null,
customStyle: {},
_styleCache: new StyleCache(),
addStyle: function (style) {
this._styles.push(style);
this._properties = null;
},
get _styleProperties() {
if (!this._properties) {
styleProperties.decorateStyles(this._styles);
this._styles._scopeStyleProperties = null;
this._properties = styleProperties.scopePropertiesFromStyles(this._styles);
styleProperties.mixinCustomStyle(this._properties, this.customStyle);
styleProperties.reify(this._properties);
}
return this._properties;
},
_needsStyleProperties: function () {
},
_computeStyleProperties: function () {
return this._styleProperties;
},
updateStyles: function (properties) {
this._properties = null;
if (properties) {
Polymer.Base.mixin(this.customStyle, properties);
}
this._styleCache.clear();
for (var i = 0, s; i < this._styles.length; i++) {
s = this._styles[i];
s = s.__importElement || s;
s._apply();
}
}
};
return api;
}();
(function () {
'use strict';
var serializeValueToAttribute = Polymer.Base.serializeValueToAttribute;
var propertyUtils = Polymer.StyleProperties;
var styleTransformer = Polymer.StyleTransformer;
var styleUtil = Polymer.StyleUtil;
var styleDefaults = Polymer.StyleDefaults;
var nativeShadow = Polymer.Settings.useNativeShadow;
Polymer.Base._addFeature({
_prepStyleProperties: function () {
this._ownStylePropertyNames = this._styles ? propertyUtils.decorateStyles(this._styles) : [];
},
customStyle: {},
_setupStyleProperties: function () {
this.customStyle = {};
},
_needsStyleProperties: function () {
return Boolean(this._ownStylePropertyNames && this._ownStylePropertyNames.length);
},
_beforeAttached: function () {
if (!this._scopeSelector && this._needsStyleProperties()) {
this._updateStyleProperties();
}
},
_findStyleHost: function () {
var e = this, root;
while (root = Polymer.dom(e).getOwnerRoot()) {
if (Polymer.isInstance(root.host)) {
return root.host;
}
e = root.host;
}
return styleDefaults;
},
_updateStyleProperties: function () {
var info, scope = this._findStyleHost();
if (!scope._styleCache) {
scope._styleCache = new Polymer.StyleCache();
}
var scopeData = propertyUtils.propertyDataFromStyles(scope._styles, this);
scopeData.key.customStyle = this.customStyle;
info = scope._styleCache.retrieve(this.is, scopeData.key, this._styles);
var scopeCached = Boolean(info);
if (scopeCached) {
this._styleProperties = info._styleProperties;
} else {
this._computeStyleProperties(scopeData.properties);
}
this._computeOwnStyleProperties();
if (!scopeCached) {
info = styleCache.retrieve(this.is, this._ownStyleProperties, this._styles);
}
var globalCached = Boolean(info) && !scopeCached;
var style = this._applyStyleProperties(info);
if (!scopeCached) {
style = style && nativeShadow ? style.cloneNode(true) : style;
info = {
style: style,
_scopeSelector: this._scopeSelector,
_styleProperties: this._styleProperties
};
scopeData.key.customStyle = {};
this.mixin(scopeData.key.customStyle, this.customStyle);
scope._styleCache.store(this.is, info, scopeData.key, this._styles);
if (!globalCached) {
styleCache.store(this.is, Object.create(info), this._ownStyleProperties, this._styles);
}
}
},
_computeStyleProperties: function (scopeProps) {
var scope = this._findStyleHost();
if (!scope._styleProperties) {
scope._computeStyleProperties();
}
var props = Object.create(scope._styleProperties);
this.mixin(props, propertyUtils.hostPropertiesFromStyles(this._styles));
scopeProps = scopeProps || propertyUtils.propertyDataFromStyles(scope._styles, this).properties;
this.mixin(props, scopeProps);
this.mixin(props, propertyUtils.scopePropertiesFromStyles(this._styles));
propertyUtils.mixinCustomStyle(props, this.customStyle);
propertyUtils.reify(props);
this._styleProperties = props;
},
_computeOwnStyleProperties: function () {
var props = {};
for (var i = 0, n; i < this._ownStylePropertyNames.length; i++) {
n = this._ownStylePropertyNames[i];
props[n] = this._styleProperties[n];
}
this._ownStyleProperties = props;
},
_scopeCount: 0,
_applyStyleProperties: function (info) {
var oldScopeSelector = this._scopeSelector;
this._scopeSelector = info ? info._scopeSelector : this.is + '-' + this.__proto__._scopeCount++;
var style = propertyUtils.applyElementStyle(this, this._styleProperties, this._scopeSelector, info && info.style);
if (!nativeShadow) {
propertyUtils.applyElementScopeSelector(this, this._scopeSelector, oldScopeSelector, this._scopeCssViaAttr);
}
return style;
},
serializeValueToAttribute: function (value, attribute, node) {
node = node || this;
if (attribute === 'class' && !nativeShadow) {
var host = node === this ? this.domHost || this.dataHost : this;
if (host) {
value = host._scopeElementClass(node, value);
}
}
node = Polymer.dom(node);
serializeValueToAttribute.call(this, value, attribute, node);
},
_scopeElementClass: function (element, selector) {
if (!nativeShadow && !this._scopeCssViaAttr) {
selector += (selector ? ' ' : '') + SCOPE_NAME + ' ' + this.is + (element._scopeSelector ? ' ' + XSCOPE_NAME + ' ' + element._scopeSelector : '');
}
return selector;
},
updateStyles: function (properties) {
if (this.isAttached) {
if (properties) {
this.mixin(this.customStyle, properties);
}
if (this._needsStyleProperties()) {
this._updateStyleProperties();
} else {
this._styleProperties = null;
}
if (this._styleCache) {
this._styleCache.clear();
}
this._updateRootStyles();
}
},
_updateRootStyles: function (root) {
root = root || this.root;
var c$ = Polymer.dom(root)._query(function (e) {
return e.shadyRoot || e.shadowRoot;
});
for (var i = 0, l = c$.length, c; i < l && (c = c$[i]); i++) {
if (c.updateStyles) {
c.updateStyles();
}
}
}
});
Polymer.updateStyles = function (properties) {
styleDefaults.updateStyles(properties);
Polymer.Base._updateRootStyles(document);
};
var styleCache = new Polymer.StyleCache();
Polymer.customStyleCache = styleCache;
var SCOPE_NAME = styleTransformer.SCOPE_NAME;
var XSCOPE_NAME = propertyUtils.XSCOPE_NAME;
}());
Polymer.Base._addFeature({
_registerFeatures: function () {
this._prepIs();
this._prepAttributes();
this._prepConstructor();
this._prepTemplate();
this._prepStyles();
this._prepStyleProperties();
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepBindings();
this._prepShady();
},
_prepBehavior: function (b) {
this._addPropertyEffects(b.properties);
this._addComplexObserverEffects(b.observers);
this._addHostAttributes(b.hostAttributes);
},
_initFeatures: function () {
this._poolContent();
this._setupConfigure();
this._setupStyleProperties();
this._pushHost();
this._stampTemplate();
this._popHost();
this._marshalAnnotationReferences();
this._setupDebouncers();
this._marshalInstanceEffects();
this._marshalHostAttributes();
this._marshalBehaviors();
this._marshalAttributes();
this._tryReady();
},
_marshalBehavior: function (b) {
this._listenListeners(b.listeners);
}
});
(function () {
var nativeShadow = Polymer.Settings.useNativeShadow;
var propertyUtils = Polymer.StyleProperties;
var styleUtil = Polymer.StyleUtil;
var cssParse = Polymer.CssParse;
var styleDefaults = Polymer.StyleDefaults;
var styleTransformer = Polymer.StyleTransformer;
Polymer({
is: 'custom-style',
extends: 'style',
properties: { include: String },
ready: function () {
this._tryApply();
},
attached: function () {
this._tryApply();
},
_tryApply: function () {
if (!this._appliesToDocument) {
if (this.parentNode && this.parentNode.localName !== 'dom-module') {
this._appliesToDocument = true;
var e = this.__appliedElement || this;
styleDefaults.addStyle(e);
if (e.textContent || this.include) {
this._apply();
} else {
var observer = new MutationObserver(function () {
observer.disconnect();
this._apply();
}.bind(this));
observer.observe(e, { childList: true });
}
}
}
},
_apply: function () {
var e = this.__appliedElement || this;
if (this.include) {
e.textContent = styleUtil.cssFromModules(this.include, true) + e.textContent;
}
if (e.textContent) {
styleUtil.forEachStyleRule(styleUtil.rulesForStyle(e), function (rule) {
styleTransformer.documentRule(rule);
});
this._applyCustomProperties(e);
}
},
_applyCustomProperties: function (element) {
this._computeStyleProperties();
var props = this._styleProperties;
var rules = styleUtil.rulesForStyle(element);
element.textContent = styleUtil.toCssText(rules, function (rule) {
var css = rule.cssText = rule.parsedCssText;
if (rule.propertyInfo && rule.propertyInfo.cssText) {
css = cssParse.removeCustomPropAssignment(css);
rule.cssText = propertyUtils.valueForProperties(css, props);
}
});
}
});
}());
Polymer.Templatizer = {
properties: { __hideTemplateChildren__: { observer: '_showHideChildren' } },
_instanceProps: Polymer.nob,
_parentPropPrefix: '_parent_',
templatize: function (template) {
this._templatized = template;
if (!template._content) {
template._content = template.content;
}
if (template._content._ctor) {
this.ctor = template._content._ctor;
this._prepParentProperties(this.ctor.prototype, template);
return;
}
var archetype = Object.create(Polymer.Base);
this._customPrepAnnotations(archetype, template);
this._prepParentProperties(archetype, template);
archetype._prepEffects();
this._customPrepEffects(archetype);
archetype._prepBehaviors();
archetype._prepBindings();
archetype._notifyPath = this._notifyPathImpl;
archetype._scopeElementClass = this._scopeElementClassImpl;
archetype.listen = this._listenImpl;
archetype._showHideChildren = this._showHideChildrenImpl;
var _constructor = this._constructorImpl;
var ctor = function TemplateInstance(model, host) {
_constructor.call(this, model, host);
};
ctor.prototype = archetype;
archetype.constructor = ctor;
template._content._ctor = ctor;
this.ctor = ctor;
},
_getRootDataHost: function () {
return this.dataHost && this.dataHost._rootDataHost || this.dataHost;
},
_showHideChildrenImpl: function (hide) {
var c = this._children;
for (var i = 0; i < c.length; i++) {
var n = c[i];
if (Boolean(hide) != Boolean(n.__hideTemplateChildren__)) {
if (n.nodeType === Node.TEXT_NODE) {
if (hide) {
n.__polymerTextContent__ = n.textContent;
n.textContent = '';
} else {
n.textContent = n.__polymerTextContent__;
}
} else if (n.style) {
if (hide) {
n.__polymerDisplay__ = n.style.display;
n.style.display = 'none';
} else {
n.style.display = n.__polymerDisplay__;
}
}
}
n.__hideTemplateChildren__ = hide;
}
},
_debounceTemplate: function (fn) {
Polymer.dom.addDebouncer(this.debounce('_debounceTemplate', fn));
},
_flushTemplates: function (debouncerExpired) {
Polymer.dom.flush();
},
_customPrepEffects: function (archetype) {
var parentProps = archetype._parentProps;
for (var prop in parentProps) {
archetype._addPropertyEffect(prop, 'function', this._createHostPropEffector(prop));
}
for (var prop in this._instanceProps) {
archetype._addPropertyEffect(prop, 'function', this._createInstancePropEffector(prop));
}
},
_customPrepAnnotations: function (archetype, template) {
archetype._template = template;
var c = template._content;
if (!c._notes) {
var rootDataHost = archetype._rootDataHost;
if (rootDataHost) {
Polymer.Annotations.prepElement = rootDataHost._prepElement.bind(rootDataHost);
}
c._notes = Polymer.Annotations.parseAnnotations(template);
Polymer.Annotations.prepElement = null;
this._processAnnotations(c._notes);
}
archetype._notes = c._notes;
archetype._parentProps = c._parentProps;
},
_prepParentProperties: function (archetype, template) {
var parentProps = this._parentProps = archetype._parentProps;
if (this._forwardParentProp && parentProps) {
var proto = archetype._parentPropProto;
var prop;
if (!proto) {
for (prop in this._instanceProps) {
delete parentProps[prop];
}
proto = archetype._parentPropProto = Object.create(null);
if (template != this) {
Polymer.Bind.prepareModel(proto);
Polymer.Base.prepareModelNotifyPath(proto);
}
for (prop in parentProps) {
var parentProp = this._parentPropPrefix + prop;
var effects = [
{
kind: 'function',
effect: this._createForwardPropEffector(prop)
},
{ kind: 'notify' }
];
Polymer.Bind._createAccessors(proto, parentProp, effects);
}
}
if (template != this) {
Polymer.Bind.prepareInstance(template);
template._forwardParentProp = this._forwardParentProp.bind(this);
}
this._extendTemplate(template, proto);
template._pathEffector = this._pathEffectorImpl.bind(this);
}
},
_createForwardPropEffector: function (prop) {
return function (source, value) {
this._forwardParentProp(prop, value);
};
},
_createHostPropEffector: function (prop) {
var prefix = this._parentPropPrefix;
return function (source, value) {
this.dataHost._templatized[prefix + prop] = value;
};
},
_createInstancePropEffector: function (prop) {
return function (source, value, old, fromAbove) {
if (!fromAbove) {
this.dataHost._forwardInstanceProp(this, prop, value);
}
};
},
_extendTemplate: function (template, proto) {
Object.getOwnPropertyNames(proto).forEach(function (n) {
var val = template[n];
var pd = Object.getOwnPropertyDescriptor(proto, n);
Object.defineProperty(template, n, pd);
if (val !== undefined) {
template._propertySetter(n, val);
}
});
},
_showHideChildren: function (hidden) {
},
_forwardInstancePath: function (inst, path, value) {
},
_forwardInstanceProp: function (inst, prop, value) {
},
_notifyPathImpl: function (path, value) {
var dataHost = this.dataHost;
var dot = path.indexOf('.');
var root = dot < 0 ? path : path.slice(0, dot);
dataHost._forwardInstancePath.call(dataHost, this, path, value);
if (root in dataHost._parentProps) {
dataHost._templatized.notifyPath(dataHost._parentPropPrefix + path, value);
}
},
_pathEffectorImpl: function (path, value, fromAbove) {
if (this._forwardParentPath) {
if (path.indexOf(this._parentPropPrefix) === 0) {
var subPath = path.substring(this._parentPropPrefix.length);
this._forwardParentPath(subPath, value);
}
}
Polymer.Base._pathEffector.call(this._templatized, path, value, fromAbove);
},
_constructorImpl: function (model, host) {
this._rootDataHost = host._getRootDataHost();
this._setupConfigure(model);
this._pushHost(host);
this.root = this.instanceTemplate(this._template);
this.root.__noContent = !this._notes._hasContent;
this.root.__styleScoped = true;
this._popHost();
this._marshalAnnotatedNodes();
this._marshalInstanceEffects();
this._marshalAnnotatedListeners();
var children = [];
for (var n = this.root.firstChild; n; n = n.nextSibling) {
children.push(n);
n._templateInstance = this;
}
this._children = children;
if (host.__hideTemplateChildren__) {
this._showHideChildren(true);
}
this._tryReady();
},
_listenImpl: function (node, eventName, methodName) {
var model = this;
var host = this._rootDataHost;
var handler = host._createEventHandler(node, eventName, methodName);
var decorated = function (e) {
e.model = model;
handler(e);
};
host._listen(node, eventName, decorated);
},
_scopeElementClassImpl: function (node, value) {
var host = this._rootDataHost;
if (host) {
return host._scopeElementClass(node, value);
}
},
stamp: function (model) {
model = model || {};
if (this._parentProps) {
var templatized = this._templatized;
for (var prop in this._parentProps) {
model[prop] = templatized[this._parentPropPrefix + prop];
}
}
return new this.ctor(model, this);
},
modelForElement: function (el) {
var model;
while (el) {
if (model = el._templateInstance) {
if (model.dataHost != this) {
el = model.dataHost;
} else {
return model;
}
} else {
el = el.parentNode;
}
}
}
};
Polymer({
is: 'dom-template',
extends: 'template',
behaviors: [Polymer.Templatizer],
ready: function () {
this.templatize(this);
}
});
Polymer._collections = new WeakMap();
Polymer.Collection = function (userArray) {
Polymer._collections.set(userArray, this);
this.userArray = userArray;
this.store = userArray.slice();
this.initMap();
};
Polymer.Collection.prototype = {
constructor: Polymer.Collection,
initMap: function () {
var omap = this.omap = new WeakMap();
var pmap = this.pmap = {};
var s = this.store;
for (var i = 0; i < s.length; i++) {
var item = s[i];
if (item && typeof item == 'object') {
omap.set(item, i);
} else {
pmap[item] = i;
}
}
},
add: function (item) {
var key = this.store.push(item) - 1;
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
return key;
},
removeKey: function (key) {
this._removeFromMap(this.store[key]);
delete this.store[key];
},
_removeFromMap: function (item) {
if (item && typeof item == 'object') {
this.omap.delete(item);
} else {
delete this.pmap[item];
}
},
remove: function (item) {
var key = this.getKey(item);
this.removeKey(key);
return key;
},
getKey: function (item) {
if (item && typeof item == 'object') {
return this.omap.get(item);
} else {
return this.pmap[item];
}
},
getKeys: function () {
return Object.keys(this.store);
},
setItem: function (key, item) {
var old = this.store[key];
if (old) {
this._removeFromMap(old);
}
if (item && typeof item == 'object') {
this.omap.set(item, key);
} else {
this.pmap[item] = key;
}
this.store[key] = item;
},
getItem: function (key) {
return this.store[key];
},
getItems: function () {
var items = [], store = this.store;
for (var key in store) {
items.push(store[key]);
}
return items;
},
_applySplices: function (splices) {
var keyMap = {}, key, i;
splices.forEach(function (s) {
s.addedKeys = [];
for (i = 0; i < s.removed.length; i++) {
key = this.getKey(s.removed[i]);
keyMap[key] = keyMap[key] ? null : -1;
}
for (i = 0; i < s.addedCount; i++) {
var item = this.userArray[s.index + i];
key = this.getKey(item);
key = key === undefined ? this.add(item) : key;
keyMap[key] = keyMap[key] ? null : 1;
s.addedKeys.push(key);
}
}, this);
var removed = [];
var added = [];
for (var key in keyMap) {
if (keyMap[key] < 0) {
this.removeKey(key);
removed.push(key);
}
if (keyMap[key] > 0) {
added.push(key);
}
}
return [{
removed: removed,
added: added
}];
}
};
Polymer.Collection.get = function (userArray) {
return Polymer._collections.get(userArray) || new Polymer.Collection(userArray);
};
Polymer.Collection.applySplices = function (userArray, splices) {
var coll = Polymer._collections.get(userArray);
return coll ? coll._applySplices(splices) : null;
};
Polymer({
is: 'dom-repeat',
extends: 'template',
properties: {
items: { type: Array },
as: {
type: String,
value: 'item'
},
indexAs: {
type: String,
value: 'index'
},
sort: {
type: Function,
observer: '_sortChanged'
},
filter: {
type: Function,
observer: '_filterChanged'
},
observe: {
type: String,
observer: '_observeChanged'
},
delay: Number
},
behaviors: [Polymer.Templatizer],
observers: ['_itemsChanged(items.*)'],
created: function () {
this._instances = [];
},
detached: function () {
for (var i = 0; i < this._instances.length; i++) {
this._detachRow(i);
}
},
attached: function () {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < this._instances.length; i++) {
Polymer.dom(parentNode).insertBefore(this._instances[i].root, this);
}
},
ready: function () {
this._instanceProps = { __key__: true };
this._instanceProps[this.as] = true;
this._instanceProps[this.indexAs] = true;
if (!this.ctor) {
this.templatize(this);
}
},
_sortChanged: function () {
var dataHost = this._getRootDataHost();
var sort = this.sort;
this._sortFn = sort && (typeof sort == 'function' ? sort : function () {
return dataHost[sort].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_filterChanged: function () {
var dataHost = this._getRootDataHost();
var filter = this.filter;
this._filterFn = filter && (typeof filter == 'function' ? filter : function () {
return dataHost[filter].apply(dataHost, arguments);
});
this._needFullRefresh = true;
if (this.items) {
this._debounceTemplate(this._render);
}
},
_observeChanged: function () {
this._observePaths = this.observe && this.observe.replace('.*', '.').split(' ');
},
_itemsChanged: function (change) {
if (change.path == 'items') {
if (Array.isArray(this.items)) {
this.collection = Polymer.Collection.get(this.items);
} else if (!this.items) {
this.collection = null;
} else {
this._error(this._logf('dom-repeat', 'expected array for `items`,' + ' found', this.items));
}
this._keySplices = [];
this._indexSplices = [];
this._needFullRefresh = true;
this._debounceTemplate(this._render);
} else if (change.path == 'items.splices') {
this._keySplices = this._keySplices.concat(change.value.keySplices);
this._indexSplices = this._indexSplices.concat(change.value.indexSplices);
this._debounceTemplate(this._render);
} else {
var subpath = change.path.slice(6);
this._forwardItemPath(subpath, change.value);
this._checkObservedPaths(subpath);
}
},
_checkObservedPaths: function (path) {
if (this._observePaths) {
path = path.substring(path.indexOf('.') + 1);
var paths = this._observePaths;
for (var i = 0; i < paths.length; i++) {
if (path.indexOf(paths[i]) === 0) {
this._needFullRefresh = true;
if (this.delay) {
this.debounce('render', this._render, this.delay);
} else {
this._debounceTemplate(this._render);
}
return;
}
}
}
},
render: function () {
this._needFullRefresh = true;
this._debounceTemplate(this._render);
this._flushTemplates();
},
_render: function () {
var c = this.collection;
if (this._needFullRefresh) {
this._applyFullRefresh();
this._needFullRefresh = false;
} else {
if (this._sortFn) {
this._applySplicesUserSort(this._keySplices);
} else {
if (this._filterFn) {
this._applyFullRefresh();
} else {
this._applySplicesArrayOrder(this._indexSplices);
}
}
}
this._keySplices = [];
this._indexSplices = [];
var keyToIdx = this._keyToInstIdx = {};
for (var i = 0; i < this._instances.length; i++) {
var inst = this._instances[i];
keyToIdx[inst.__key__] = i;
inst.__setProperty(this.indexAs, i, true);
}
this.fire('dom-change');
},
_applyFullRefresh: function () {
var c = this.collection;
var keys;
if (this._sortFn) {
keys = c ? c.getKeys() : [];
} else {
keys = [];
var items = this.items;
if (items) {
for (var i = 0; i < items.length; i++) {
keys.push(c.getKey(items[i]));
}
}
}
if (this._filterFn) {
keys = keys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
if (this._sortFn) {
keys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
}
for (var i = 0; i < keys.length; i++) {
var key = keys[i];
var inst = this._instances[i];
if (inst) {
inst.__setProperty('__key__', key, true);
inst.__setProperty(this.as, c.getItem(key), true);
} else {
this._instances.push(this._insertRow(i, key));
}
}
for (; i < this._instances.length; i++) {
this._detachRow(i);
}
this._instances.splice(keys.length, this._instances.length - keys.length);
},
_keySort: function (a, b) {
return this.collection.getKey(a) - this.collection.getKey(b);
},
_numericSort: function (a, b) {
return a - b;
},
_applySplicesUserSort: function (splices) {
var c = this.collection;
var instances = this._instances;
var keyMap = {};
var pool = [];
var sortFn = this._sortFn || this._keySort.bind(this);
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var key = s.removed[i];
keyMap[key] = keyMap[key] ? null : -1;
}
for (var i = 0; i < s.added.length; i++) {
var key = s.added[i];
keyMap[key] = keyMap[key] ? null : 1;
}
}, this);
var removedIdxs = [];
var addedKeys = [];
for (var key in keyMap) {
if (keyMap[key] === -1) {
removedIdxs.push(this._keyToInstIdx[key]);
}
if (keyMap[key] === 1) {
addedKeys.push(key);
}
}
if (removedIdxs.length) {
removedIdxs.sort(this._numericSort);
for (var i = removedIdxs.length - 1; i >= 0; i--) {
var idx = removedIdxs[i];
if (idx !== undefined) {
pool.push(this._detachRow(idx));
instances.splice(idx, 1);
}
}
}
if (addedKeys.length) {
if (this._filterFn) {
addedKeys = addedKeys.filter(function (a) {
return this._filterFn(c.getItem(a));
}, this);
}
addedKeys.sort(function (a, b) {
return this._sortFn(c.getItem(a), c.getItem(b));
}.bind(this));
var start = 0;
for (var i = 0; i < addedKeys.length; i++) {
start = this._insertRowUserSort(start, addedKeys[i], pool);
}
}
},
_insertRowUserSort: function (start, key, pool) {
var c = this.collection;
var item = c.getItem(key);
var end = this._instances.length - 1;
var idx = -1;
var sortFn = this._sortFn || this._keySort.bind(this);
while (start <= end) {
var mid = start + end >> 1;
var midKey = this._instances[mid].__key__;
var cmp = sortFn(c.getItem(midKey), item);
if (cmp < 0) {
start = mid + 1;
} else if (cmp > 0) {
end = mid - 1;
} else {
idx = mid;
break;
}
}
if (idx < 0) {
idx = end + 1;
}
this._instances.splice(idx, 0, this._insertRow(idx, key, pool));
return idx;
},
_applySplicesArrayOrder: function (splices) {
var pool = [];
var c = this.collection;
splices.forEach(function (s) {
for (var i = 0; i < s.removed.length; i++) {
var inst = this._detachRow(s.index + i);
if (!inst.isPlaceholder) {
pool.push(inst);
}
}
this._instances.splice(s.index, s.removed.length);
for (var i = 0; i < s.addedKeys.length; i++) {
var inst = {
isPlaceholder: true,
key: s.addedKeys[i]
};
this._instances.splice(s.index + i, 0, inst);
}
}, this);
for (var i = this._instances.length - 1; i >= 0; i--) {
var inst = this._instances[i];
if (inst.isPlaceholder) {
this._instances[i] = this._insertRow(i, inst.key, pool, true);
}
}
},
_detachRow: function (idx) {
var inst = this._instances[idx];
if (!inst.isPlaceholder) {
var parentNode = Polymer.dom(this).parentNode;
for (var i = 0; i < inst._children.length; i++) {
var el = inst._children[i];
Polymer.dom(inst.root).appendChild(el);
}
}
return inst;
},
_insertRow: function (idx, key, pool, replace) {
var inst;
if (inst = pool && pool.pop()) {
inst.__setProperty(this.as, this.collection.getItem(key), true);
inst.__setProperty('__key__', key, true);
} else {
inst = this._generateRow(idx, key);
}
var beforeRow = this._instances[replace ? idx + 1 : idx];
var beforeNode = beforeRow ? beforeRow._children[0] : this;
var parentNode = Polymer.dom(this).parentNode;
Polymer.dom(parentNode).insertBefore(inst.root, beforeNode);
return inst;
},
_generateRow: function (idx, key) {
var model = { __key__: key };
model[this.as] = this.collection.getItem(key);
model[this.indexAs] = idx;
var inst = this.stamp(model);
return inst;
},
_showHideChildren: function (hidden) {
for (var i = 0; i < this._instances.length; i++) {
this._instances[i]._showHideChildren(hidden);
}
},
_forwardInstanceProp: function (inst, prop, value) {
if (prop == this.as) {
var idx;
if (this._sortFn || this._filterFn) {
idx = this.items.indexOf(this.collection.getItem(inst.__key__));
} else {
idx = inst[this.indexAs];
}
this.set('items.' + idx, value);
}
},
_forwardInstancePath: function (inst, path, value) {
if (path.indexOf(this.as + '.') === 0) {
this.notifyPath('items.' + inst.__key__ + '.' + path.slice(this.as.length + 1), value);
}
},
_forwardParentProp: function (prop, value) {
this._instances.forEach(function (inst) {
inst.__setProperty(prop, value, true);
}, this);
},
_forwardParentPath: function (path, value) {
this._instances.forEach(function (inst) {
inst.notifyPath(path, value, true);
}, this);
},
_forwardItemPath: function (path, value) {
if (this._keyToInstIdx) {
var dot = path.indexOf('.');
var key = path.substring(0, dot < 0 ? path.length : dot);
var idx = this._keyToInstIdx[key];
var inst = this._instances[idx];
if (inst) {
if (dot >= 0) {
path = this.as + '.' + path.substring(dot + 1);
inst.notifyPath(path, value, true);
} else {
inst.__setProperty(this.as, value, true);
}
}
}
},
itemForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.as];
},
keyForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance.__key__;
},
indexForElement: function (el) {
var instance = this.modelForElement(el);
return instance && instance[this.indexAs];
}
});
Polymer({
is: 'array-selector',
properties: {
items: {
type: Array,
observer: 'clearSelection'
},
multi: {
type: Boolean,
value: false,
observer: 'clearSelection'
},
selected: {
type: Object,
notify: true
},
selectedItem: {
type: Object,
notify: true
},
toggle: {
type: Boolean,
value: false
}
},
clearSelection: function () {
if (Array.isArray(this.selected)) {
for (var i = 0; i < this.selected.length; i++) {
this.unlinkPaths('selected.' + i);
}
} else {
this.unlinkPaths('selected');
}
if (this.multi) {
if (!this.selected || this.selected.length) {
this.selected = [];
this._selectedColl = Polymer.Collection.get(this.selected);
}
} else {
this.selected = null;
this._selectedColl = null;
}
this.selectedItem = null;
},
isSelected: function (item) {
if (this.multi) {
return this._selectedColl.getKey(item) !== undefined;
} else {
return this.selected == item;
}
},
deselect: function (item) {
if (this.multi) {
if (this.isSelected(item)) {
var skey = this._selectedColl.getKey(item);
this.arrayDelete('selected', item);
this.unlinkPaths('selected.' + skey);
}
} else {
this.selected = null;
this.selectedItem = null;
this.unlinkPaths('selected');
this.unlinkPaths('selectedItem');
}
},
select: function (item) {
var icol = Polymer.Collection.get(this.items);
var key = icol.getKey(item);
if (this.multi) {
if (this.isSelected(item)) {
if (this.toggle) {
this.deselect(item);
}
} else {
this.push('selected', item);
var skey = this._selectedColl.getKey(item);
this.linkPaths('selected.' + skey, 'items.' + key);
}
} else {
if (this.toggle && item == this.selected) {
this.deselect();
} else {
this.selected = item;
this.selectedItem = item;
this.linkPaths('selected', 'items.' + key);
this.linkPaths('selectedItem', 'items.' + key);
}
}
}
});
Polymer({
is: 'dom-if',
extends: 'template',
properties: {
'if': {
type: Boolean,
value: false,
observer: '_queueRender'
},
restamp: {
type: Boolean,
value: false,
observer: '_queueRender'
}
},
behaviors: [Polymer.Templatizer],
_queueRender: function () {
this._debounceTemplate(this._render);
},
detached: function () {
this._teardownInstance();
},
attached: function () {
if (this.if && this.ctor) {
this.async(this._ensureInstance);
}
},
render: function () {
this._flushTemplates();
},
_render: function () {
if (this.if) {
if (!this.ctor) {
this.templatize(this);
}
this._ensureInstance();
this._showHideChildren();
} else if (this.restamp) {
this._teardownInstance();
}
if (!this.restamp && this._instance) {
this._showHideChildren();
}
if (this.if != this._lastIf) {
this.fire('dom-change');
this._lastIf = this.if;
}
},
_ensureInstance: function () {
if (!this._instance) {
this._instance = this.stamp();
var root = this._instance.root;
var parent = Polymer.dom(Polymer.dom(this).parentNode);
parent.insertBefore(root, this);
}
},
_teardownInstance: function () {
if (this._instance) {
var c = this._instance._children;
if (c) {
var parent = Polymer.dom(Polymer.dom(c[0]).parentNode);
c.forEach(function (n) {
parent.removeChild(n);
});
}
this._instance = null;
}
},
_showHideChildren: function () {
var hidden = this.__hideTemplateChildren__ || !this.if;
if (this._instance) {
this._instance._showHideChildren(hidden);
}
},
_forwardParentProp: function (prop, value) {
if (this._instance) {
this._instance[prop] = value;
}
},
_forwardParentPath: function (path, value) {
if (this._instance) {
this._instance.notifyPath(path, value, true);
}
}
});
Polymer({
is: 'dom-bind',
extends: 'template',
created: function () {
Polymer.RenderStatus.whenReady(this._markImportsReady.bind(this));
},
_ensureReady: function () {
if (!this._readied) {
this._readySelf();
}
},
_markImportsReady: function () {
this._importsReady = true;
this._ensureReady();
},
_registerFeatures: function () {
this._prepConstructor();
},
_insertChildren: function () {
var parentDom = Polymer.dom(Polymer.dom(this).parentNode);
parentDom.insertBefore(this.root, this);
},
_removeChildren: function () {
if (this._children) {
for (var i = 0; i < this._children.length; i++) {
this.root.appendChild(this._children[i]);
}
}
},
_initFeatures: function () {
},
_scopeElementClass: function (element, selector) {
if (this.dataHost) {
return this.dataHost._scopeElementClass(element, selector);
} else {
return selector;
}
},
_prepConfigure: function () {
var config = {};
for (var prop in this._propertyEffects) {
config[prop] = this[prop];
}
this._setupConfigure = this._setupConfigure.bind(this, config);
},
attached: function () {
if (this._importsReady) {
this.render();
}
},
detached: function () {
this._removeChildren();
},
render: function () {
this._ensureReady();
if (!this._children) {
this._template = this;
this._prepAnnotations();
this._prepEffects();
this._prepBehaviors();
this._prepConfigure();
this._prepBindings();
Polymer.Base._initFeatures.call(this);
this._children = Array.prototype.slice.call(this.root.childNodes);
}
this._insertChildren();
this.fire('dom-change');
}
});
(function () {
var g, aa = this;
function n(a) {
return void 0 !== a;
}
function ba() {
}
function ca(a) {
a.ub = function () {
return a.uf ? a.uf : a.uf = new a();
};
}
function da(a) {
var b = typeof a;
if ('object' == b)
if (a) {
if (a instanceof Array)
return 'array';
if (a instanceof Object)
return b;
var c = Object.prototype.toString.call(a);
if ('[object Window]' == c)
return 'object';
if ('[object Array]' == c || 'number' == typeof a.length && 'undefined' != typeof a.splice && 'undefined' != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable('splice'))
return 'array';
if ('[object Function]' == c || 'undefined' != typeof a.call && 'undefined' != typeof a.propertyIsEnumerable && !a.propertyIsEnumerable('call'))
return 'function';
} else
return 'null';
else if ('function' == b && 'undefined' == typeof a.call)
return 'object';
return b;
}
function ea(a) {
return 'array' == da(a);
}
function fa(a) {
var b = da(a);
return 'array' == b || 'object' == b && 'number' == typeof a.length;
}
function p(a) {
return 'string' == typeof a;
}
function ga(a) {
return 'number' == typeof a;
}
function ha(a) {
return 'function' == da(a);
}
function ia(a) {
var b = typeof a;
return 'object' == b && null != a || 'function' == b;
}
function ja(a, b, c) {
return a.call.apply(a.bind, arguments);
}
function ka(a, b, c) {
if (!a)
throw Error();
if (2 < arguments.length) {
var d = Array.prototype.slice.call(arguments, 2);
return function () {
var c = Array.prototype.slice.call(arguments);
Array.prototype.unshift.apply(c, d);
return a.apply(b, c);
};
}
return function () {
return a.apply(b, arguments);
};
}
function q(a, b, c) {
q = Function.prototype.bind && -1 != Function.prototype.bind.toString().indexOf('native code') ? ja : ka;
return q.apply(null, arguments);
}
var la = Date.now || function () {
return +new Date();
};
function ma(a, b) {
function c() {
}
c.prototype = b.prototype;
a.bh = b.prototype;
a.prototype = new c();
a.prototype.constructor = a;
a.Yg = function (a, c, f) {
for (var h = Array(arguments.length - 2), k = 2; k < arguments.length; k++)
h[k - 2] = arguments[k];
return b.prototype[c].apply(a, h);
};
}
;
function r(a, b) {
for (var c in a)
b.call(void 0, a[c], c, a);
}
function na(a, b) {
var c = {}, d;
for (d in a)
c[d] = b.call(void 0, a[d], d, a);
return c;
}
function oa(a, b) {
for (var c in a)
if (!b.call(void 0, a[c], c, a))
return !1;
return !0;
}
function pa(a) {
var b = 0, c;
for (c in a)
b++;
return b;
}
function qa(a) {
for (var b in a)
return b;
}
function ra(a) {
var b = [], c = 0, d;
for (d in a)
b[c++] = a[d];
return b;
}
function sa(a) {
var b = [], c = 0, d;
for (d in a)
b[c++] = d;
return b;
}
function ta(a, b) {
for (var c in a)
if (a[c] == b)
return !0;
return !1;
}
function ua(a, b, c) {
for (var d in a)
if (b.call(c, a[d], d, a))
return d;
}
function va(a, b) {
var c = ua(a, b, void 0);
return c && a[c];
}
function wa(a) {
for (var b in a)
return !1;
return !0;
}
function xa(a) {
var b = {}, c;
for (c in a)
b[c] = a[c];
return b;
}
var ya = 'constructor hasOwnProperty isPrototypeOf propertyIsEnumerable toLocaleString toString valueOf'.split(' ');
function za(a, b) {
for (var c, d, e = 1; e < arguments.length; e++) {
d = arguments[e];
for (c in d)
a[c] = d[c];
for (var f = 0; f < ya.length; f++)
c = ya[f], Object.prototype.hasOwnProperty.call(d, c) && (a[c] = d[c]);
}
}
;
function Aa(a) {
a = String(a);
if (/^\s*$/.test(a) ? 0 : /^[\],:{}\s\u2028\u2029]*$/.test(a.replace(/\\["\\\/bfnrtu]/g, '@').replace(/"[^"\\\n\r\u2028\u2029\x00-\x08\x0a-\x1f]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']').replace(/(?:^|:|,)(?:[\s\u2028\u2029]*\[)+/g, '')))
try {
return eval('(' + a + ')');
} catch (b) {
}
throw Error('Invalid JSON string: ' + a);
}
function Ba() {
this.Sd = void 0;
}
function Ca(a, b, c) {
switch (typeof b) {
case 'string':
Da(b, c);
break;
case 'number':
c.push(isFinite(b) && !isNaN(b) ? b : 'null');
break;
case 'boolean':
c.push(b);
break;
case 'undefined':
c.push('null');
break;
case 'object':
if (null == b) {
c.push('null');
break;
}
if (ea(b)) {
var d = b.length;
c.push('[');
for (var e = '', f = 0; f < d; f++)
c.push(e), e = b[f], Ca(a, a.Sd ? a.Sd.call(b, String(f), e) : e, c), e = ',';
c.push(']');
break;
}
c.push('{');
d = '';
for (f in b)
Object.prototype.hasOwnProperty.call(b, f) && (e = b[f], 'function' != typeof e && (c.push(d), Da(f, c), c.push(':'), Ca(a, a.Sd ? a.Sd.call(b, f, e) : e, c), d = ','));
c.push('}');
break;
case 'function':
break;
default:
throw Error('Unknown type: ' + typeof b);
}
}
var Ea = {
'"': '\\"',
'\\': '\\\\',
'/': '\\/',
'\b': '\\b',
'\f': '\\f',
'\n': '\\n',
'\r': '\\r',
'\t': '\\t',
'\x0B': '\\u000b'
}, Fa = /\uffff/.test('\uFFFF') ? /[\\\"\x00-\x1f\x7f-\uffff]/g : /[\\\"\x00-\x1f\x7f-\xff]/g;
function Da(a, b) {
b.push('"', a.replace(Fa, function (a) {
if (a in Ea)
return Ea[a];
var b = a.charCodeAt(0), e = '\\u';
16 > b ? e += '000' : 256 > b ? e += '00' : 4096 > b && (e += '0');
return Ea[a] = e + b.toString(16);
}), '"');
}
;
function Ga() {
return Math.floor(2147483648 * Math.random()).toString(36) + Math.abs(Math.floor(2147483648 * Math.random()) ^ la()).toString(36);
}
;
var Ha;
a: {
var Ia = aa.navigator;
if (Ia) {
var Ja = Ia.userAgent;
if (Ja) {
Ha = Ja;
break a;
}
}
Ha = '';
}
;
function Ka() {
this.Va = -1;
}
;
function La() {
this.Va = -1;
this.Va = 64;
this.N = [];
this.me = [];
this.Wf = [];
this.Ld = [];
this.Ld[0] = 128;
for (var a = 1; a < this.Va; ++a)
this.Ld[a] = 0;
this.de = this.ac = 0;
this.reset();
}
ma(La, Ka);
La.prototype.reset = function () {
this.N[0] = 1732584193;
this.N[1] = 4023233417;
this.N[2] = 2562383102;
this.N[3] = 271733878;
this.N[4] = 3285377520;
this.de = this.ac = 0;
};
function Ma(a, b, c) {
c || (c = 0);
var d = a.Wf;
if (p(b))
for (var e = 0; 16 > e; e++)
d[e] = b.charCodeAt(c) << 24 | b.charCodeAt(c + 1) << 16 | b.charCodeAt(c + 2) << 8 | b.charCodeAt(c + 3), c += 4;
else
for (e = 0; 16 > e; e++)
d[e] = b[c] << 24 | b[c + 1] << 16 | b[c + 2] << 8 | b[c + 3], c += 4;
for (e = 16; 80 > e; e++) {
var f = d[e - 3] ^ d[e - 8] ^ d[e - 14] ^ d[e - 16];
d[e] = (f << 1 | f >>> 31) & 4294967295;
}
b = a.N[0];
c = a.N[1];
for (var h = a.N[2], k = a.N[3], l = a.N[4], m, e = 0; 80 > e; e++)
40 > e ? 20 > e ? (f = k ^ c & (h ^ k), m = 1518500249) : (f = c ^ h ^ k, m = 1859775393) : 60 > e ? (f = c & h | k & (c | h), m = 2400959708) : (f = c ^ h ^ k, m = 3395469782), f = (b << 5 | b >>> 27) + f + l + m + d[e] & 4294967295, l = k, k = h, h = (c << 30 | c >>> 2) & 4294967295, c = b, b = f;
a.N[0] = a.N[0] + b & 4294967295;
a.N[1] = a.N[1] + c & 4294967295;
a.N[2] = a.N[2] + h & 4294967295;
a.N[3] = a.N[3] + k & 4294967295;
a.N[4] = a.N[4] + l & 4294967295;
}
La.prototype.update = function (a, b) {
if (null != a) {
n(b) || (b = a.length);
for (var c = b - this.Va, d = 0, e = this.me, f = this.ac; d < b;) {
if (0 == f)
for (; d <= c;)
Ma(this, a, d), d += this.Va;
if (p(a))
for (; d < b;) {
if (e[f] = a.charCodeAt(d), ++f, ++d, f == this.Va) {
Ma(this, e);
f = 0;
break;
}
}
else
for (; d < b;)
if (e[f] = a[d], ++f, ++d, f == this.Va) {
Ma(this, e);
f = 0;
break;
}
}
this.ac = f;
this.de += b;
}
};
var u = Array.prototype, Na = u.indexOf ? function (a, b, c) {
return u.indexOf.call(a, b, c);
} : function (a, b, c) {
c = null == c ? 0 : 0 > c ? Math.max(0, a.length + c) : c;
if (p(a))
return p(b) && 1 == b.length ? a.indexOf(b, c) : -1;
for (; c < a.length; c++)
if (c in a && a[c] === b)
return c;
return -1;
}, Oa = u.forEach ? function (a, b, c) {
u.forEach.call(a, b, c);
} : function (a, b, c) {
for (var d = a.length, e = p(a) ? a.split('') : a, f = 0; f < d; f++)
f in e && b.call(c, e[f], f, a);
}, Pa = u.filter ? function (a, b, c) {
return u.filter.call(a, b, c);
} : function (a, b, c) {
for (var d = a.length, e = [], f = 0, h = p(a) ? a.split('') : a, k = 0; k < d; k++)
if (k in h) {
var l = h[k];
b.call(c, l, k, a) && (e[f++] = l);
}
return e;
}, Qa = u.map ? function (a, b, c) {
return u.map.call(a, b, c);
} : function (a, b, c) {
for (var d = a.length, e = Array(d), f = p(a) ? a.split('') : a, h = 0; h < d; h++)
h in f && (e[h] = b.call(c, f[h], h, a));
return e;
}, Ra = u.reduce ? function (a, b, c, d) {
for (var e = [], f = 1, h = arguments.length; f < h; f++)
e.push(arguments[f]);
d && (e[0] = q(b, d));
return u.reduce.apply(a, e);
} : function (a, b, c, d) {
var e = c;
Oa(a, function (c, h) {
e = b.call(d, e, c, h, a);
});
return e;
}, Sa = u.every ? function (a, b, c) {
return u.every.call(a, b, c);
} : function (a, b, c) {
for (var d = a.length, e = p(a) ? a.split('') : a, f = 0; f < d; f++)
if (f in e && !b.call(c, e[f], f, a))
return !1;
return !0;
};
function Ta(a, b) {
var c = Ua(a, b, void 0);
return 0 > c ? null : p(a) ? a.charAt(c) : a[c];
}
function Ua(a, b, c) {
for (var d = a.length, e = p(a) ? a.split('') : a, f = 0; f < d; f++)
if (f in e && b.call(c, e[f], f, a))
return f;
return -1;
}
function Va(a, b) {
var c = Na(a, b);
0 <= c && u.splice.call(a, c, 1);
}
function Wa(a, b, c) {
return 2 >= arguments.length ? u.slice.call(a, b) : u.slice.call(a, b, c);
}
function Xa(a, b) {
a.sort(b || Ya);
}
function Ya(a, b) {
return a > b ? 1 : a < b ? -1 : 0;
}
;
var Za = -1 != Ha.indexOf('Opera') || -1 != Ha.indexOf('OPR'), $a = -1 != Ha.indexOf('Trident') || -1 != Ha.indexOf('MSIE'), ab = -1 != Ha.indexOf('Gecko') && -1 == Ha.toLowerCase().indexOf('webkit') && !(-1 != Ha.indexOf('Trident') || -1 != Ha.indexOf('MSIE')), bb = -1 != Ha.toLowerCase().indexOf('webkit');
(function () {
var a = '', b;
if (Za && aa.opera)
return a = aa.opera.version, ha(a) ? a() : a;
ab ? b = /rv\:([^\);]+)(\)|;)/ : $a ? b = /\b(?:MSIE|rv)[: ]([^\);]+)(\)|;)/ : bb && (b = /WebKit\/(\S+)/);
b && (a = (a = b.exec(Ha)) ? a[1] : '');
return $a && (b = (b = aa.document) ? b.documentMode : void 0, b > parseFloat(a)) ? String(b) : a;
}());
var cb = null, db = null, eb = null;
function fb(a, b) {
if (!fa(a))
throw Error('encodeByteArray takes an array as a parameter');
gb();
for (var c = b ? db : cb, d = [], e = 0; e < a.length; e += 3) {
var f = a[e], h = e + 1 < a.length, k = h ? a[e + 1] : 0, l = e + 2 < a.length, m = l ? a[e + 2] : 0, t = f >> 2, f = (f & 3) << 4 | k >> 4, k = (k & 15) << 2 | m >> 6, m = m & 63;
l || (m = 64, h || (k = 64));
d.push(c[t], c[f], c[k], c[m]);
}
return d.join('');
}
function gb() {
if (!cb) {
cb = {};
db = {};
eb = {};
for (var a = 0; 65 > a; a++)
cb[a] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(a), db[a] = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_.'.charAt(a), eb[db[a]] = a, 62 <= a && (eb['ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='.charAt(a)] = a);
}
}
;
var hb = hb || '2.3.1';
function v(a, b) {
return Object.prototype.hasOwnProperty.call(a, b);
}
function w(a, b) {
if (Object.prototype.hasOwnProperty.call(a, b))
return a[b];
}
function ib(a, b) {
for (var c in a)
Object.prototype.hasOwnProperty.call(a, c) && b(c, a[c]);
}
function jb(a) {
var b = {};
ib(a, function (a, d) {
b[a] = d;
});
return b;
}
;
function kb(a) {
var b = [];
ib(a, function (a, d) {
ea(d) ? Oa(d, function (d) {
b.push(encodeURIComponent(a) + '=' + encodeURIComponent(d));
}) : b.push(encodeURIComponent(a) + '=' + encodeURIComponent(d));
});
return b.length ? '&' + b.join('&') : '';
}
function lb(a) {
var b = {};
a = a.replace(/^\?/, '').split('&');
Oa(a, function (a) {
a && (a = a.split('='), b[a[0]] = a[1]);
});
return b;
}
;
function x(a, b, c, d) {
var e;
d < b ? e = 'at least ' + b : d > c && (e = 0 === c ? 'none' : 'no more than ' + c);
if (e)
throw Error(a + ' failed: Was called with ' + d + (1 === d ? ' argument.' : ' arguments.') + ' Expects ' + e + '.');
}
function y(a, b, c) {
var d = '';
switch (b) {
case 1:
d = c ? 'first' : 'First';
break;
case 2:
d = c ? 'second' : 'Second';
break;
case 3:
d = c ? 'third' : 'Third';
break;
case 4:
d = c ? 'fourth' : 'Fourth';
break;
default:
throw Error('errorPrefix called with argumentNumber > 4.  Need to update it?');
}
return a = a + ' failed: ' + (d + ' argument ');
}
function A(a, b, c, d) {
if ((!d || n(c)) && !ha(c))
throw Error(y(a, b, d) + 'must be a valid function.');
}
function mb(a, b, c) {
if (n(c) && (!ia(c) || null === c))
throw Error(y(a, b, !0) + 'must be a valid context object.');
}
;
function nb(a) {
return 'undefined' !== typeof JSON && n(JSON.parse) ? JSON.parse(a) : Aa(a);
}
function B(a) {
if ('undefined' !== typeof JSON && n(JSON.stringify))
a = JSON.stringify(a);
else {
var b = [];
Ca(new Ba(), a, b);
a = b.join('');
}
return a;
}
;
function ob() {
this.Wd = C;
}
ob.prototype.j = function (a) {
return this.Wd.Q(a);
};
ob.prototype.toString = function () {
return this.Wd.toString();
};
function pb() {
}
pb.prototype.qf = function () {
return null;
};
pb.prototype.ye = function () {
return null;
};
var qb = new pb();
function rb(a, b, c) {
this.Tf = a;
this.Ka = b;
this.Kd = c;
}
rb.prototype.qf = function (a) {
var b = this.Ka.O;
if (sb(b, a))
return b.j().R(a);
b = null != this.Kd ? new tb(this.Kd, !0, !1) : this.Ka.w();
return this.Tf.xc(a, b);
};
rb.prototype.ye = function (a, b, c) {
var d = null != this.Kd ? this.Kd : ub(this.Ka);
a = this.Tf.ne(d, b, 1, c, a);
return 0 === a.length ? null : a[0];
};
function vb() {
this.tb = [];
}
function wb(a, b) {
for (var c = null, d = 0; d < b.length; d++) {
var e = b[d], f = e.Zb();
null === c || f.ca(c.Zb()) || (a.tb.push(c), c = null);
null === c && (c = new xb(f));
c.add(e);
}
c && a.tb.push(c);
}
function yb(a, b, c) {
wb(a, c);
zb(a, function (a) {
return a.ca(b);
});
}
function Ab(a, b, c) {
wb(a, c);
zb(a, function (a) {
return a.contains(b) || b.contains(a);
});
}
function zb(a, b) {
for (var c = !0, d = 0; d < a.tb.length; d++) {
var e = a.tb[d];
if (e)
if (e = e.Zb(), b(e)) {
for (var e = a.tb[d], f = 0; f < e.vd.length; f++) {
var h = e.vd[f];
if (null !== h) {
e.vd[f] = null;
var k = h.Vb();
Bb && Cb('event: ' + h.toString());
Db(k);
}
}
a.tb[d] = null;
} else
c = !1;
}
c && (a.tb = []);
}
function xb(a) {
this.ra = a;
this.vd = [];
}
xb.prototype.add = function (a) {
this.vd.push(a);
};
xb.prototype.Zb = function () {
return this.ra;
};
function D(a, b, c, d) {
this.type = a;
this.Ja = b;
this.Wa = c;
this.Ke = d;
this.Qd = void 0;
}
function Eb(a) {
return new D(Fb, a);
}
var Fb = 'value';
function Gb(a, b, c, d) {
this.ue = b;
this.Zd = c;
this.Qd = d;
this.ud = a;
}
Gb.prototype.Zb = function () {
var a = this.Zd.Ib();
return 'value' === this.ud ? a.path : a.parent().path;
};
Gb.prototype.ze = function () {
return this.ud;
};
Gb.prototype.Vb = function () {
return this.ue.Vb(this);
};
Gb.prototype.toString = function () {
return this.Zb().toString() + ':' + this.ud + ':' + B(this.Zd.mf());
};
function Hb(a, b, c) {
this.ue = a;
this.error = b;
this.path = c;
}
Hb.prototype.Zb = function () {
return this.path;
};
Hb.prototype.ze = function () {
return 'cancel';
};
Hb.prototype.Vb = function () {
return this.ue.Vb(this);
};
Hb.prototype.toString = function () {
return this.path.toString() + ':cancel';
};
function tb(a, b, c) {
this.A = a;
this.ea = b;
this.Ub = c;
}
function Ib(a) {
return a.ea;
}
function Jb(a) {
return a.Ub;
}
function Kb(a, b) {
return b.e() ? a.ea && !a.Ub : sb(a, E(b));
}
function sb(a, b) {
return a.ea && !a.Ub || a.A.Da(b);
}
tb.prototype.j = function () {
return this.A;
};
function Lb(a) {
this.gg = a;
this.Dd = null;
}
Lb.prototype.get = function () {
var a = this.gg.get(), b = xa(a);
if (this.Dd)
for (var c in this.Dd)
b[c] -= this.Dd[c];
this.Dd = a;
return b;
};
function Mb(a, b) {
this.Of = {};
this.fd = new Lb(a);
this.ba = b;
var c = 10000 + 20000 * Math.random();
setTimeout(q(this.If, this), Math.floor(c));
}
Mb.prototype.If = function () {
var a = this.fd.get(), b = {}, c = !1, d;
for (d in a)
0 < a[d] && v(this.Of, d) && (b[d] = a[d], c = !0);
c && this.ba.Ue(b);
setTimeout(q(this.If, this), Math.floor(600000 * Math.random()));
};
function Nb() {
this.Ec = {};
}
function Ob(a, b, c) {
n(c) || (c = 1);
v(a.Ec, b) || (a.Ec[b] = 0);
a.Ec[b] += c;
}
Nb.prototype.get = function () {
return xa(this.Ec);
};
var Pb = {}, Qb = {};
function Rb(a) {
a = a.toString();
Pb[a] || (Pb[a] = new Nb());
return Pb[a];
}
function Sb(a, b) {
var c = a.toString();
Qb[c] || (Qb[c] = b());
return Qb[c];
}
;
function F(a, b) {
this.name = a;
this.S = b;
}
function Tb(a, b) {
return new F(a, b);
}
;
function Ub(a, b) {
return Vb(a.name, b.name);
}
function Wb(a, b) {
return Vb(a, b);
}
;
function Xb(a, b, c) {
this.type = Yb;
this.source = a;
this.path = b;
this.Ga = c;
}
Xb.prototype.Xc = function (a) {
return this.path.e() ? new Xb(this.source, G, this.Ga.R(a)) : new Xb(this.source, H(this.path), this.Ga);
};
Xb.prototype.toString = function () {
return 'Operation(' + this.path + ': ' + this.source.toString() + ' overwrite: ' + this.Ga.toString() + ')';
};
function Zb(a, b) {
this.type = $b;
this.source = a;
this.path = b;
}
Zb.prototype.Xc = function () {
return this.path.e() ? new Zb(this.source, G) : new Zb(this.source, H(this.path));
};
Zb.prototype.toString = function () {
return 'Operation(' + this.path + ': ' + this.source.toString() + ' listen_complete)';
};
function ac(a, b) {
this.La = a;
this.wa = b ? b : bc;
}
g = ac.prototype;
g.Oa = function (a, b) {
return new ac(this.La, this.wa.Oa(a, b, this.La).Y(null, null, !1, null, null));
};
g.remove = function (a) {
return new ac(this.La, this.wa.remove(a, this.La).Y(null, null, !1, null, null));
};
g.get = function (a) {
for (var b, c = this.wa; !c.e();) {
b = this.La(a, c.key);
if (0 === b)
return c.value;
0 > b ? c = c.left : 0 < b && (c = c.right);
}
return null;
};
function cc(a, b) {
for (var c, d = a.wa, e = null; !d.e();) {
c = a.La(b, d.key);
if (0 === c) {
if (d.left.e())
return e ? e.key : null;
for (d = d.left; !d.right.e();)
d = d.right;
return d.key;
}
0 > c ? d = d.left : 0 < c && (e = d, d = d.right);
}
throw Error('Attempted to find predecessor key for a nonexistent key.  What gives?');
}
g.e = function () {
return this.wa.e();
};
g.count = function () {
return this.wa.count();
};
g.Sc = function () {
return this.wa.Sc();
};
g.fc = function () {
return this.wa.fc();
};
g.ia = function (a) {
return this.wa.ia(a);
};
g.Xb = function (a) {
return new dc(this.wa, null, this.La, !1, a);
};
g.Yb = function (a, b) {
return new dc(this.wa, a, this.La, !1, b);
};
g.$b = function (a, b) {
return new dc(this.wa, a, this.La, !0, b);
};
g.sf = function (a) {
return new dc(this.wa, null, this.La, !0, a);
};
function dc(a, b, c, d, e) {
this.Ud = e || null;
this.Fe = d;
this.Pa = [];
for (e = 1; !a.e();)
if (e = b ? c(a.key, b) : 1, d && (e *= -1), 0 > e)
a = this.Fe ? a.left : a.right;
else if (0 === e) {
this.Pa.push(a);
break;
} else
this.Pa.push(a), a = this.Fe ? a.right : a.left;
}
function J(a) {
if (0 === a.Pa.length)
return null;
var b = a.Pa.pop(), c;
c = a.Ud ? a.Ud(b.key, b.value) : {
key: b.key,
value: b.value
};
if (a.Fe)
for (b = b.left; !b.e();)
a.Pa.push(b), b = b.right;
else
for (b = b.right; !b.e();)
a.Pa.push(b), b = b.left;
return c;
}
function ec(a) {
if (0 === a.Pa.length)
return null;
var b;
b = a.Pa;
b = b[b.length - 1];
return a.Ud ? a.Ud(b.key, b.value) : {
key: b.key,
value: b.value
};
}
function fc(a, b, c, d, e) {
this.key = a;
this.value = b;
this.color = null != c ? c : !0;
this.left = null != d ? d : bc;
this.right = null != e ? e : bc;
}
g = fc.prototype;
g.Y = function (a, b, c, d, e) {
return new fc(null != a ? a : this.key, null != b ? b : this.value, null != c ? c : this.color, null != d ? d : this.left, null != e ? e : this.right);
};
g.count = function () {
return this.left.count() + 1 + this.right.count();
};
g.e = function () {
return !1;
};
g.ia = function (a) {
return this.left.ia(a) || a(this.key, this.value) || this.right.ia(a);
};
function gc(a) {
return a.left.e() ? a : gc(a.left);
}
g.Sc = function () {
return gc(this).key;
};
g.fc = function () {
return this.right.e() ? this.key : this.right.fc();
};
g.Oa = function (a, b, c) {
var d, e;
e = this;
d = c(a, e.key);
e = 0 > d ? e.Y(null, null, null, e.left.Oa(a, b, c), null) : 0 === d ? e.Y(null, b, null, null, null) : e.Y(null, null, null, null, e.right.Oa(a, b, c));
return hc(e);
};
function ic(a) {
if (a.left.e())
return bc;
a.left.fa() || a.left.left.fa() || (a = jc(a));
a = a.Y(null, null, null, ic(a.left), null);
return hc(a);
}
g.remove = function (a, b) {
var c, d;
c = this;
if (0 > b(a, c.key))
c.left.e() || c.left.fa() || c.left.left.fa() || (c = jc(c)), c = c.Y(null, null, null, c.left.remove(a, b), null);
else {
c.left.fa() && (c = kc(c));
c.right.e() || c.right.fa() || c.right.left.fa() || (c = lc(c), c.left.left.fa() && (c = kc(c), c = lc(c)));
if (0 === b(a, c.key)) {
if (c.right.e())
return bc;
d = gc(c.right);
c = c.Y(d.key, d.value, null, null, ic(c.right));
}
c = c.Y(null, null, null, null, c.right.remove(a, b));
}
return hc(c);
};
g.fa = function () {
return this.color;
};
function hc(a) {
a.right.fa() && !a.left.fa() && (a = mc(a));
a.left.fa() && a.left.left.fa() && (a = kc(a));
a.left.fa() && a.right.fa() && (a = lc(a));
return a;
}
function jc(a) {
a = lc(a);
a.right.left.fa() && (a = a.Y(null, null, null, null, kc(a.right)), a = mc(a), a = lc(a));
return a;
}
function mc(a) {
return a.right.Y(null, null, a.color, a.Y(null, null, !0, null, a.right.left), null);
}
function kc(a) {
return a.left.Y(null, null, a.color, null, a.Y(null, null, !0, a.left.right, null));
}
function lc(a) {
return a.Y(null, null, !a.color, a.left.Y(null, null, !a.left.color, null, null), a.right.Y(null, null, !a.right.color, null, null));
}
function nc() {
}
g = nc.prototype;
g.Y = function () {
return this;
};
g.Oa = function (a, b) {
return new fc(a, b, null);
};
g.remove = function () {
return this;
};
g.count = function () {
return 0;
};
g.e = function () {
return !0;
};
g.ia = function () {
return !1;
};
g.Sc = function () {
return null;
};
g.fc = function () {
return null;
};
g.fa = function () {
return !1;
};
var bc = new nc();
function oc(a, b) {
return a && 'object' === typeof a ? (K('.sv' in a, 'Unexpected leaf node or priority contents'), b[a['.sv']]) : a;
}
function pc(a, b) {
var c = new qc();
rc(a, new L(''), function (a, e) {
c.nc(a, sc(e, b));
});
return c;
}
function sc(a, b) {
var c = a.C().I(), c = oc(c, b), d;
if (a.K()) {
var e = oc(a.Ca(), b);
return e !== a.Ca() || c !== a.C().I() ? new tc(e, M(c)) : a;
}
d = a;
c !== a.C().I() && (d = d.ga(new tc(c)));
a.P(N, function (a, c) {
var e = sc(c, b);
e !== c && (d = d.U(a, e));
});
return d;
}
;
function uc() {
this.wc = {};
}
uc.prototype.set = function (a, b) {
null == b ? delete this.wc[a] : this.wc[a] = b;
};
uc.prototype.get = function (a) {
return v(this.wc, a) ? this.wc[a] : null;
};
uc.prototype.remove = function (a) {
delete this.wc[a];
};
uc.prototype.wf = !0;
function vc(a) {
this.Fc = a;
this.Pd = 'firebase:';
}
g = vc.prototype;
g.set = function (a, b) {
null == b ? this.Fc.removeItem(this.Pd + a) : this.Fc.setItem(this.Pd + a, B(b));
};
g.get = function (a) {
a = this.Fc.getItem(this.Pd + a);
return null == a ? null : nb(a);
};
g.remove = function (a) {
this.Fc.removeItem(this.Pd + a);
};
g.wf = !1;
g.toString = function () {
return this.Fc.toString();
};
function wc(a) {
try {
if ('undefined' !== typeof window && 'undefined' !== typeof window[a]) {
var b = window[a];
b.setItem('firebase:sentinel', 'cache');
b.removeItem('firebase:sentinel');
return new vc(b);
}
} catch (c) {
}
return new uc();
}
var xc = wc('localStorage'), yc = wc('sessionStorage');
function zc(a, b, c, d, e) {
this.host = a.toLowerCase();
this.domain = this.host.substr(this.host.indexOf('.') + 1);
this.kb = b;
this.hc = c;
this.Wg = d;
this.Od = e || '';
this.Ya = xc.get('host:' + a) || this.host;
}
function Ac(a, b) {
b !== a.Ya && (a.Ya = b, 's-' === a.Ya.substr(0, 2) && xc.set('host:' + a.host, a.Ya));
}
function Bc(a, b, c) {
K('string' === typeof b, 'typeof type must == string');
K('object' === typeof c, 'typeof params must == object');
if (b === Cc)
b = (a.kb ? 'wss://' : 'ws://') + a.Ya + '/.ws?';
else if (b === Dc)
b = (a.kb ? 'https://' : 'http://') + a.Ya + '/.lp?';
else
throw Error('Unknown connection type: ' + b);
a.host !== a.Ya && (c.ns = a.hc);
var d = [];
r(c, function (a, b) {
d.push(b + '=' + a);
});
return b + d.join('&');
}
zc.prototype.toString = function () {
var a = (this.kb ? 'https://' : 'http://') + this.host;
this.Od && (a += '<' + this.Od + '>');
return a;
};
var Ec = function () {
var a = 1;
return function () {
return a++;
};
}();
function K(a, b) {
if (!a)
throw Fc(b);
}
function Fc(a) {
return Error('Firebase (' + hb + ') INTERNAL ASSERT FAILED: ' + a);
}
function Gc(a) {
try {
var b;
if ('undefined' !== typeof atob)
b = atob(a);
else {
gb();
for (var c = eb, d = [], e = 0; e < a.length;) {
var f = c[a.charAt(e++)], h = e < a.length ? c[a.charAt(e)] : 0;
++e;
var k = e < a.length ? c[a.charAt(e)] : 64;
++e;
var l = e < a.length ? c[a.charAt(e)] : 64;
++e;
if (null == f || null == h || null == k || null == l)
throw Error();
d.push(f << 2 | h >> 4);
64 != k && (d.push(h << 4 & 240 | k >> 2), 64 != l && d.push(k << 6 & 192 | l));
}
if (8192 > d.length)
b = String.fromCharCode.apply(null, d);
else {
a = '';
for (c = 0; c < d.length; c += 8192)
a += String.fromCharCode.apply(null, Wa(d, c, c + 8192));
b = a;
}
}
return b;
} catch (m) {
Cb('base64Decode failed: ', m);
}
return null;
}
function Hc(a) {
var b = Ic(a);
a = new La();
a.update(b);
var b = [], c = 8 * a.de;
56 > a.ac ? a.update(a.Ld, 56 - a.ac) : a.update(a.Ld, a.Va - (a.ac - 56));
for (var d = a.Va - 1; 56 <= d; d--)
a.me[d] = c & 255, c /= 256;
Ma(a, a.me);
for (d = c = 0; 5 > d; d++)
for (var e = 24; 0 <= e; e -= 8)
b[c] = a.N[d] >> e & 255, ++c;
return fb(b);
}
function Jc(a) {
for (var b = '', c = 0; c < arguments.length; c++)
b = fa(arguments[c]) ? b + Jc.apply(null, arguments[c]) : 'object' === typeof arguments[c] ? b + B(arguments[c]) : b + arguments[c], b += ' ';
return b;
}
var Bb = null, Kc = !0;
function Cb(a) {
!0 === Kc && (Kc = !1, null === Bb && !0 === yc.get('logging_enabled') && Lc(!0));
if (Bb) {
var b = Jc.apply(null, arguments);
Bb(b);
}
}
function Mc(a) {
return function () {
Cb(a, arguments);
};
}
function Nc(a) {
if ('undefined' !== typeof console) {
var b = 'FIREBASE INTERNAL ERROR: ' + Jc.apply(null, arguments);
'undefined' !== typeof console.error ? console.error(b) : console.log(b);
}
}
function Oc(a) {
var b = Jc.apply(null, arguments);
throw Error('FIREBASE FATAL ERROR: ' + b);
}
function O(a) {
if ('undefined' !== typeof console) {
var b = 'FIREBASE WARNING: ' + Jc.apply(null, arguments);
'undefined' !== typeof console.warn ? console.warn(b) : console.log(b);
}
}
function Pc(a) {
var b = '', c = '', d = '', e = '', f = !0, h = 'https', k = 443;
if (p(a)) {
var l = a.indexOf('//');
0 <= l && (h = a.substring(0, l - 1), a = a.substring(l + 2));
l = a.indexOf('/');
-1 === l && (l = a.length);
b = a.substring(0, l);
e = '';
a = a.substring(l).split('/');
for (l = 0; l < a.length; l++)
if (0 < a[l].length) {
var m = a[l];
try {
m = decodeURIComponent(m.replace(/\+/g, ' '));
} catch (t) {
}
e += '/' + m;
}
a = b.split('.');
3 === a.length ? (c = a[1], d = a[0].toLowerCase()) : 2 === a.length && (c = a[0]);
l = b.indexOf(':');
0 <= l && (f = 'https' === h || 'wss' === h, k = b.substring(l + 1), isFinite(k) && (k = String(k)), k = p(k) ? /^\s*-?0x/i.test(k) ? parseInt(k, 16) : parseInt(k, 10) : NaN);
}
return {
host: b,
port: k,
domain: c,
Tg: d,
kb: f,
scheme: h,
$c: e
};
}
function Qc(a) {
return ga(a) && (a != a || a == Number.POSITIVE_INFINITY || a == Number.NEGATIVE_INFINITY);
}
function Rc(a) {
if ('complete' === document.readyState)
a();
else {
var b = !1, c = function () {
document.body ? b || (b = !0, a()) : setTimeout(c, Math.floor(10));
};
document.addEventListener ? (document.addEventListener('DOMContentLoaded', c, !1), window.addEventListener('load', c, !1)) : document.attachEvent && (document.attachEvent('onreadystatechange', function () {
'complete' === document.readyState && c();
}), window.attachEvent('onload', c));
}
}
function Vb(a, b) {
if (a === b)
return 0;
if ('[MIN_NAME]' === a || '[MAX_NAME]' === b)
return -1;
if ('[MIN_NAME]' === b || '[MAX_NAME]' === a)
return 1;
var c = Sc(a), d = Sc(b);
return null !== c ? null !== d ? 0 == c - d ? a.length - b.length : c - d : -1 : null !== d ? 1 : a < b ? -1 : 1;
}
function Tc(a, b) {
if (b && a in b)
return b[a];
throw Error('Missing required key (' + a + ') in object: ' + B(b));
}
function Uc(a) {
if ('object' !== typeof a || null === a)
return B(a);
var b = [], c;
for (c in a)
b.push(c);
b.sort();
c = '{';
for (var d = 0; d < b.length; d++)
0 !== d && (c += ','), c += B(b[d]), c += ':', c += Uc(a[b[d]]);
return c + '}';
}
function Vc(a, b) {
if (a.length <= b)
return [a];
for (var c = [], d = 0; d < a.length; d += b)
d + b > a ? c.push(a.substring(d, a.length)) : c.push(a.substring(d, d + b));
return c;
}
function Wc(a, b) {
if (ea(a))
for (var c = 0; c < a.length; ++c)
b(c, a[c]);
else
r(a, b);
}
function Xc(a) {
K(!Qc(a), 'Invalid JSON number');
var b, c, d, e;
0 === a ? (d = c = 0, b = -Infinity === 1 / a ? 1 : 0) : (b = 0 > a, a = Math.abs(a), a >= Math.pow(2, -1022) ? (d = Math.min(Math.floor(Math.log(a) / Math.LN2), 1023), c = d + 1023, d = Math.round(a * Math.pow(2, 52 - d) - Math.pow(2, 52))) : (c = 0, d = Math.round(a / Math.pow(2, -1074))));
e = [];
for (a = 52; a; --a)
e.push(d % 2 ? 1 : 0), d = Math.floor(d / 2);
for (a = 11; a; --a)
e.push(c % 2 ? 1 : 0), c = Math.floor(c / 2);
e.push(b ? 1 : 0);
e.reverse();
b = e.join('');
c = '';
for (a = 0; 64 > a; a += 8)
d = parseInt(b.substr(a, 8), 2).toString(16), 1 === d.length && (d = '0' + d), c += d;
return c.toLowerCase();
}
var Yc = /^-?\d{1,10}$/;
function Sc(a) {
return Yc.test(a) && (a = Number(a), -2147483648 <= a && 2147483647 >= a) ? a : null;
}
function Db(a) {
try {
a();
} catch (b) {
setTimeout(function () {
O('Exception was thrown by user callback.', b.stack || '');
throw b;
}, Math.floor(0));
}
}
function P(a, b) {
if (ha(a)) {
var c = Array.prototype.slice.call(arguments, 1).slice();
Db(function () {
a.apply(null, c);
});
}
}
;
function Ic(a) {
for (var b = [], c = 0, d = 0; d < a.length; d++) {
var e = a.charCodeAt(d);
55296 <= e && 56319 >= e && (e -= 55296, d++, K(d < a.length, 'Surrogate pair missing trail surrogate.'), e = 65536 + (e << 10) + (a.charCodeAt(d) - 56320));
128 > e ? b[c++] = e : (2048 > e ? b[c++] = e >> 6 | 192 : (65536 > e ? b[c++] = e >> 12 | 224 : (b[c++] = e >> 18 | 240, b[c++] = e >> 12 & 63 | 128), b[c++] = e >> 6 & 63 | 128), b[c++] = e & 63 | 128);
}
return b;
}
function Zc(a) {
for (var b = 0, c = 0; c < a.length; c++) {
var d = a.charCodeAt(c);
128 > d ? b++ : 2048 > d ? b += 2 : 55296 <= d && 56319 >= d ? (b += 4, c++) : b += 3;
}
return b;
}
;
function $c(a) {
var b = {}, c = {}, d = {}, e = '';
try {
var f = a.split('.'), b = nb(Gc(f[0]) || ''), c = nb(Gc(f[1]) || ''), e = f[2], d = c.d || {};
delete c.d;
} catch (h) {
}
return {
Zg: b,
Bc: c,
data: d,
Qg: e
};
}
function ad(a) {
a = $c(a).Bc;
return 'object' === typeof a && a.hasOwnProperty('iat') ? w(a, 'iat') : null;
}
function bd(a) {
a = $c(a);
var b = a.Bc;
return !!a.Qg && !!b && 'object' === typeof b && b.hasOwnProperty('iat');
}
;
function cd(a) {
this.W = a;
this.g = a.n.g;
}
function dd(a, b, c, d) {
var e = [], f = [];
Oa(b, function (b) {
'child_changed' === b.type && a.g.Ad(b.Ke, b.Ja) && f.push(new D('child_moved', b.Ja, b.Wa));
});
ed(a, e, 'child_removed', b, d, c);
ed(a, e, 'child_added', b, d, c);
ed(a, e, 'child_moved', f, d, c);
ed(a, e, 'child_changed', b, d, c);
ed(a, e, Fb, b, d, c);
return e;
}
function ed(a, b, c, d, e, f) {
d = Pa(d, function (a) {
return a.type === c;
});
Xa(d, q(a.hg, a));
Oa(d, function (c) {
var d = fd(a, c, f);
Oa(e, function (e) {
e.Kf(c.type) && b.push(e.createEvent(d, a.W));
});
});
}
function fd(a, b, c) {
'value' !== b.type && 'child_removed' !== b.type && (b.Qd = c.rf(b.Wa, b.Ja, a.g));
return b;
}
cd.prototype.hg = function (a, b) {
if (null == a.Wa || null == b.Wa)
throw Fc('Should only compare child_ events.');
return this.g.compare(new F(a.Wa, a.Ja), new F(b.Wa, b.Ja));
};
function gd() {
this.bb = {};
}
function hd(a, b) {
var c = b.type, d = b.Wa;
K('child_added' == c || 'child_changed' == c || 'child_removed' == c, 'Only child changes supported for tracking');
K('.priority' !== d, 'Only non-priority child changes can be tracked.');
var e = w(a.bb, d);
if (e) {
var f = e.type;
if ('child_added' == c && 'child_removed' == f)
a.bb[d] = new D('child_changed', b.Ja, d, e.Ja);
else if ('child_removed' == c && 'child_added' == f)
delete a.bb[d];
else if ('child_removed' == c && 'child_changed' == f)
a.bb[d] = new D('child_removed', e.Ke, d);
else if ('child_changed' == c && 'child_added' == f)
a.bb[d] = new D('child_added', b.Ja, d);
else if ('child_changed' == c && 'child_changed' == f)
a.bb[d] = new D('child_changed', b.Ja, d, e.Ke);
else
throw Fc('Illegal combination of changes: ' + b + ' occurred after ' + e);
} else
a.bb[d] = b;
}
;
function id(a, b, c) {
this.Rb = a;
this.pb = b;
this.rb = c || null;
}
g = id.prototype;
g.Kf = function (a) {
return 'value' === a;
};
g.createEvent = function (a, b) {
var c = b.n.g;
return new Gb('value', this, new Q(a.Ja, b.Ib(), c));
};
g.Vb = function (a) {
var b = this.rb;
if ('cancel' === a.ze()) {
K(this.pb, 'Raising a cancel event on a listener with no cancel callback');
var c = this.pb;
return function () {
c.call(b, a.error);
};
}
var d = this.Rb;
return function () {
d.call(b, a.Zd);
};
};
g.gf = function (a, b) {
return this.pb ? new Hb(this, a, b) : null;
};
g.matches = function (a) {
return a instanceof id ? a.Rb && this.Rb ? a.Rb === this.Rb && a.rb === this.rb : !0 : !1;
};
g.tf = function () {
return null !== this.Rb;
};
function jd(a, b, c) {
this.ha = a;
this.pb = b;
this.rb = c;
}
g = jd.prototype;
g.Kf = function (a) {
a = 'children_added' === a ? 'child_added' : a;
return ('children_removed' === a ? 'child_removed' : a) in this.ha;
};
g.gf = function (a, b) {
return this.pb ? new Hb(this, a, b) : null;
};
g.createEvent = function (a, b) {
K(null != a.Wa, 'Child events should have a childName.');
var c = b.Ib().u(a.Wa);
return new Gb(a.type, this, new Q(a.Ja, c, b.n.g), a.Qd);
};
g.Vb = function (a) {
var b = this.rb;
if ('cancel' === a.ze()) {
K(this.pb, 'Raising a cancel event on a listener with no cancel callback');
var c = this.pb;
return function () {
c.call(b, a.error);
};
}
var d = this.ha[a.ud];
return function () {
d.call(b, a.Zd, a.Qd);
};
};
g.matches = function (a) {
if (a instanceof jd) {
if (!this.ha || !a.ha)
return !0;
if (this.rb === a.rb) {
var b = pa(a.ha);
if (b === pa(this.ha)) {
if (1 === b) {
var b = qa(a.ha), c = qa(this.ha);
return c === b && (!a.ha[b] || !this.ha[c] || a.ha[b] === this.ha[c]);
}
return oa(this.ha, function (b, c) {
return a.ha[c] === b;
});
}
}
}
return !1;
};
g.tf = function () {
return null !== this.ha;
};
function kd(a) {
this.g = a;
}
g = kd.prototype;
g.G = function (a, b, c, d, e, f) {
K(a.Jc(this.g), 'A node must be indexed if only a child is updated');
e = a.R(b);
if (e.Q(d).ca(c.Q(d)) && e.e() == c.e())
return a;
null != f && (c.e() ? a.Da(b) ? hd(f, new D('child_removed', e, b)) : K(a.K(), 'A child remove without an old child only makes sense on a leaf node') : e.e() ? hd(f, new D('child_added', c, b)) : hd(f, new D('child_changed', c, b, e)));
return a.K() && c.e() ? a : a.U(b, c).lb(this.g);
};
g.xa = function (a, b, c) {
null != c && (a.K() || a.P(N, function (a, e) {
b.Da(a) || hd(c, new D('child_removed', e, a));
}), b.K() || b.P(N, function (b, e) {
if (a.Da(b)) {
var f = a.R(b);
f.ca(e) || hd(c, new D('child_changed', e, b, f));
} else
hd(c, new D('child_added', e, b));
}));
return b.lb(this.g);
};
g.ga = function (a, b) {
return a.e() ? C : a.ga(b);
};
g.Na = function () {
return !1;
};
g.Wb = function () {
return this;
};
function ld(a) {
this.Be = new kd(a.g);
this.g = a.g;
var b;
a.ma ? (b = md(a), b = a.g.Pc(nd(a), b)) : b = a.g.Tc();
this.ed = b;
a.pa ? (b = od(a), a = a.g.Pc(pd(a), b)) : a = a.g.Qc();
this.Gc = a;
}
g = ld.prototype;
g.matches = function (a) {
return 0 >= this.g.compare(this.ed, a) && 0 >= this.g.compare(a, this.Gc);
};
g.G = function (a, b, c, d, e, f) {
this.matches(new F(b, c)) || (c = C);
return this.Be.G(a, b, c, d, e, f);
};
g.xa = function (a, b, c) {
b.K() && (b = C);
var d = b.lb(this.g), d = d.ga(C), e = this;
b.P(N, function (a, b) {
e.matches(new F(a, b)) || (d = d.U(a, C));
});
return this.Be.xa(a, d, c);
};
g.ga = function (a) {
return a;
};
g.Na = function () {
return !0;
};
g.Wb = function () {
return this.Be;
};
function qd(a) {
this.sa = new ld(a);
this.g = a.g;
K(a.ja, 'Only valid if limit has been set');
this.ka = a.ka;
this.Jb = !rd(a);
}
g = qd.prototype;
g.G = function (a, b, c, d, e, f) {
this.sa.matches(new F(b, c)) || (c = C);
return a.R(b).ca(c) ? a : a.Db() < this.ka ? this.sa.Wb().G(a, b, c, d, e, f) : sd(this, a, b, c, e, f);
};
g.xa = function (a, b, c) {
var d;
if (b.K() || b.e())
d = C.lb(this.g);
else if (2 * this.ka < b.Db() && b.Jc(this.g)) {
d = C.lb(this.g);
b = this.Jb ? b.$b(this.sa.Gc, this.g) : b.Yb(this.sa.ed, this.g);
for (var e = 0; 0 < b.Pa.length && e < this.ka;) {
var f = J(b), h;
if (h = this.Jb ? 0 >= this.g.compare(this.sa.ed, f) : 0 >= this.g.compare(f, this.sa.Gc))
d = d.U(f.name, f.S), e++;
else
break;
}
} else {
d = b.lb(this.g);
d = d.ga(C);
var k, l, m;
if (this.Jb) {
b = d.sf(this.g);
k = this.sa.Gc;
l = this.sa.ed;
var t = td(this.g);
m = function (a, b) {
return t(b, a);
};
} else
b = d.Xb(this.g), k = this.sa.ed, l = this.sa.Gc, m = td(this.g);
for (var e = 0, z = !1; 0 < b.Pa.length;)
f = J(b), !z && 0 >= m(k, f) && (z = !0), (h = z && e < this.ka && 0 >= m(f, l)) ? e++ : d = d.U(f.name, C);
}
return this.sa.Wb().xa(a, d, c);
};
g.ga = function (a) {
return a;
};
g.Na = function () {
return !0;
};
g.Wb = function () {
return this.sa.Wb();
};
function sd(a, b, c, d, e, f) {
var h;
if (a.Jb) {
var k = td(a.g);
h = function (a, b) {
return k(b, a);
};
} else
h = td(a.g);
K(b.Db() == a.ka, '');
var l = new F(c, d), m = a.Jb ? ud(b, a.g) : vd(b, a.g), t = a.sa.matches(l);
if (b.Da(c)) {
for (var z = b.R(c), m = e.ye(a.g, m, a.Jb); null != m && (m.name == c || b.Da(m.name));)
m = e.ye(a.g, m, a.Jb);
e = null == m ? 1 : h(m, l);
if (t && !d.e() && 0 <= e)
return null != f && hd(f, new D('child_changed', d, c, z)), b.U(c, d);
null != f && hd(f, new D('child_removed', z, c));
b = b.U(c, C);
return null != m && a.sa.matches(m) ? (null != f && hd(f, new D('child_added', m.S, m.name)), b.U(m.name, m.S)) : b;
}
return d.e() ? b : t && 0 <= h(m, l) ? (null != f && (hd(f, new D('child_removed', m.S, m.name)), hd(f, new D('child_added', d, c))), b.U(c, d).U(m.name, C)) : b;
}
;
function wd(a, b) {
this.je = a;
this.fg = b;
}
function xd(a) {
this.V = a;
}
xd.prototype.ab = function (a, b, c, d) {
var e = new gd(), f;
if (b.type === Yb)
b.source.we ? c = yd(this, a, b.path, b.Ga, c, d, e) : (K(b.source.pf, 'Unknown source.'), f = b.source.af || Jb(a.w()) && !b.path.e(), c = Ad(this, a, b.path, b.Ga, c, d, f, e));
else if (b.type === Bd)
b.source.we ? c = Cd(this, a, b.path, b.children, c, d, e) : (K(b.source.pf, 'Unknown source.'), f = b.source.af || Jb(a.w()), c = Dd(this, a, b.path, b.children, c, d, f, e));
else if (b.type === Ed)
if (b.Vd)
if (b = b.path, null != c.tc(b))
c = a;
else {
f = new rb(c, a, d);
d = a.O.j();
if (b.e() || '.priority' === E(b))
Ib(a.w()) ? b = c.za(ub(a)) : (b = a.w().j(), K(b instanceof R, 'serverChildren would be complete if leaf node'), b = c.yc(b)), b = this.V.xa(d, b, e);
else {
var h = E(b), k = c.xc(h, a.w());
null == k && sb(a.w(), h) && (k = d.R(h));
b = null != k ? this.V.G(d, h, k, H(b), f, e) : a.O.j().Da(h) ? this.V.G(d, h, C, H(b), f, e) : d;
b.e() && Ib(a.w()) && (d = c.za(ub(a)), d.K() && (b = this.V.xa(b, d, e)));
}
d = Ib(a.w()) || null != c.tc(G);
c = Fd(a, b, d, this.V.Na());
}
else
c = Gd(this, a, b.path, b.Qb, c, d, e);
else if (b.type === $b)
d = b.path, b = a.w(), f = b.j(), h = b.ea || d.e(), c = Hd(this, new Id(a.O, new tb(f, h, b.Ub)), d, c, qb, e);
else
throw Fc('Unknown operation type: ' + b.type);
e = ra(e.bb);
d = c;
b = d.O;
b.ea && (f = b.j().K() || b.j().e(), h = Jd(a), (0 < e.length || !a.O.ea || f && !b.j().ca(h) || !b.j().C().ca(h.C())) && e.push(Eb(Jd(d))));
return new wd(c, e);
};
function Hd(a, b, c, d, e, f) {
var h = b.O;
if (null != d.tc(c))
return b;
var k;
if (c.e())
K(Ib(b.w()), 'If change path is empty, we must have complete server data'), Jb(b.w()) ? (e = ub(b), d = d.yc(e instanceof R ? e : C)) : d = d.za(ub(b)), f = a.V.xa(b.O.j(), d, f);
else {
var l = E(c);
if ('.priority' == l)
K(1 == Kd(c), 'Can\'t have a priority with additional path components'), f = h.j(), k = b.w().j(), d = d.ld(c, f, k), f = null != d ? a.V.ga(f, d) : h.j();
else {
var m = H(c);
sb(h, l) ? (k = b.w().j(), d = d.ld(c, h.j(), k), d = null != d ? h.j().R(l).G(m, d) : h.j().R(l)) : d = d.xc(l, b.w());
f = null != d ? a.V.G(h.j(), l, d, m, e, f) : h.j();
}
}
return Fd(b, f, h.ea || c.e(), a.V.Na());
}
function Ad(a, b, c, d, e, f, h, k) {
var l = b.w();
h = h ? a.V : a.V.Wb();
if (c.e())
d = h.xa(l.j(), d, null);
else if (h.Na() && !l.Ub)
d = l.j().G(c, d), d = h.xa(l.j(), d, null);
else {
var m = E(c);
if (!Kb(l, c) && 1 < Kd(c))
return b;
var t = H(c);
d = l.j().R(m).G(t, d);
d = '.priority' == m ? h.ga(l.j(), d) : h.G(l.j(), m, d, t, qb, null);
}
l = l.ea || c.e();
b = new Id(b.O, new tb(d, l, h.Na()));
return Hd(a, b, c, e, new rb(e, b, f), k);
}
function yd(a, b, c, d, e, f, h) {
var k = b.O;
e = new rb(e, b, f);
if (c.e())
h = a.V.xa(b.O.j(), d, h), a = Fd(b, h, !0, a.V.Na());
else if (f = E(c), '.priority' === f)
h = a.V.ga(b.O.j(), d), a = Fd(b, h, k.ea, k.Ub);
else {
c = H(c);
var l = k.j().R(f);
if (!c.e()) {
var m = e.qf(f);
d = null != m ? '.priority' === Ld(c) && m.Q(c.parent()).e() ? m : m.G(c, d) : C;
}
l.ca(d) ? a = b : (h = a.V.G(k.j(), f, d, c, e, h), a = Fd(b, h, k.ea, a.V.Na()));
}
return a;
}
function Cd(a, b, c, d, e, f, h) {
var k = b;
Md(d, function (d, m) {
var t = c.u(d);
sb(b.O, E(t)) && (k = yd(a, k, t, m, e, f, h));
});
Md(d, function (d, m) {
var t = c.u(d);
sb(b.O, E(t)) || (k = yd(a, k, t, m, e, f, h));
});
return k;
}
function Nd(a, b) {
Md(b, function (b, d) {
a = a.G(b, d);
});
return a;
}
function Dd(a, b, c, d, e, f, h, k) {
if (b.w().j().e() && !Ib(b.w()))
return b;
var l = b;
c = c.e() ? d : Od(Pd, c, d);
var m = b.w().j();
c.children.ia(function (c, d) {
if (m.Da(c)) {
var I = b.w().j().R(c), I = Nd(I, d);
l = Ad(a, l, new L(c), I, e, f, h, k);
}
});
c.children.ia(function (c, d) {
var I = !sb(b.w(), c) && null == d.value;
m.Da(c) || I || (I = b.w().j().R(c), I = Nd(I, d), l = Ad(a, l, new L(c), I, e, f, h, k));
});
return l;
}
function Gd(a, b, c, d, e, f, h) {
if (null != e.tc(c))
return b;
var k = Jb(b.w()), l = b.w();
if (null != d.value) {
if (c.e() && l.ea || Kb(l, c))
return Ad(a, b, c, l.j().Q(c), e, f, k, h);
if (c.e()) {
var m = Pd;
l.j().P(Qd, function (a, b) {
m = m.set(new L(a), b);
});
return Dd(a, b, c, m, e, f, k, h);
}
return b;
}
m = Pd;
Md(d, function (a) {
var b = c.u(a);
Kb(l, b) && (m = m.set(a, l.j().Q(b)));
});
return Dd(a, b, c, m, e, f, k, h);
}
;
function Rd() {
}
var Sd = {};
function td(a) {
return q(a.compare, a);
}
Rd.prototype.Ad = function (a, b) {
return 0 !== this.compare(new F('[MIN_NAME]', a), new F('[MIN_NAME]', b));
};
Rd.prototype.Tc = function () {
return Td;
};
function Ud(a) {
K(!a.e() && '.priority' !== E(a), 'Can\'t create PathIndex with empty path or .priority key');
this.cc = a;
}
ma(Ud, Rd);
g = Ud.prototype;
g.Ic = function (a) {
return !a.Q(this.cc).e();
};
g.compare = function (a, b) {
var c = a.S.Q(this.cc), d = b.S.Q(this.cc), c = c.Dc(d);
return 0 === c ? Vb(a.name, b.name) : c;
};
g.Pc = function (a, b) {
var c = M(a), c = C.G(this.cc, c);
return new F(b, c);
};
g.Qc = function () {
var a = C.G(this.cc, Vd);
return new F('[MAX_NAME]', a);
};
g.toString = function () {
return this.cc.slice().join('/');
};
function Wd() {
}
ma(Wd, Rd);
g = Wd.prototype;
g.compare = function (a, b) {
var c = a.S.C(), d = b.S.C(), c = c.Dc(d);
return 0 === c ? Vb(a.name, b.name) : c;
};
g.Ic = function (a) {
return !a.C().e();
};
g.Ad = function (a, b) {
return !a.C().ca(b.C());
};
g.Tc = function () {
return Td;
};
g.Qc = function () {
return new F('[MAX_NAME]', new tc('[PRIORITY-POST]', Vd));
};
g.Pc = function (a, b) {
var c = M(a);
return new F(b, new tc('[PRIORITY-POST]', c));
};
g.toString = function () {
return '.priority';
};
var N = new Wd();
function Xd() {
}
ma(Xd, Rd);
g = Xd.prototype;
g.compare = function (a, b) {
return Vb(a.name, b.name);
};
g.Ic = function () {
throw Fc('KeyIndex.isDefinedOn not expected to be called.');
};
g.Ad = function () {
return !1;
};
g.Tc = function () {
return Td;
};
g.Qc = function () {
return new F('[MAX_NAME]', C);
};
g.Pc = function (a) {
K(p(a), 'KeyIndex indexValue must always be a string.');
return new F(a, C);
};
g.toString = function () {
return '.key';
};
var Qd = new Xd();
function Yd() {
}
ma(Yd, Rd);
g = Yd.prototype;
g.compare = function (a, b) {
var c = a.S.Dc(b.S);
return 0 === c ? Vb(a.name, b.name) : c;
};
g.Ic = function () {
return !0;
};
g.Ad = function (a, b) {
return !a.ca(b);
};
g.Tc = function () {
return Td;
};
g.Qc = function () {
return Zd;
};
g.Pc = function (a, b) {
var c = M(a);
return new F(b, c);
};
g.toString = function () {
return '.value';
};
var $d = new Yd();
function ae() {
this.Tb = this.pa = this.Lb = this.ma = this.ja = !1;
this.ka = 0;
this.Nb = '';
this.ec = null;
this.xb = '';
this.bc = null;
this.vb = '';
this.g = N;
}
var be = new ae();
function rd(a) {
return '' === a.Nb ? a.ma : 'l' === a.Nb;
}
function nd(a) {
K(a.ma, 'Only valid if start has been set');
return a.ec;
}
function md(a) {
K(a.ma, 'Only valid if start has been set');
return a.Lb ? a.xb : '[MIN_NAME]';
}
function pd(a) {
K(a.pa, 'Only valid if end has been set');
return a.bc;
}
function od(a) {
K(a.pa, 'Only valid if end has been set');
return a.Tb ? a.vb : '[MAX_NAME]';
}
function ce(a) {
var b = new ae();
b.ja = a.ja;
b.ka = a.ka;
b.ma = a.ma;
b.ec = a.ec;
b.Lb = a.Lb;
b.xb = a.xb;
b.pa = a.pa;
b.bc = a.bc;
b.Tb = a.Tb;
b.vb = a.vb;
b.g = a.g;
return b;
}
g = ae.prototype;
g.He = function (a) {
var b = ce(this);
b.ja = !0;
b.ka = a;
b.Nb = '';
return b;
};
g.Ie = function (a) {
var b = ce(this);
b.ja = !0;
b.ka = a;
b.Nb = 'l';
return b;
};
g.Je = function (a) {
var b = ce(this);
b.ja = !0;
b.ka = a;
b.Nb = 'r';
return b;
};
g.$d = function (a, b) {
var c = ce(this);
c.ma = !0;
n(a) || (a = null);
c.ec = a;
null != b ? (c.Lb = !0, c.xb = b) : (c.Lb = !1, c.xb = '');
return c;
};
g.td = function (a, b) {
var c = ce(this);
c.pa = !0;
n(a) || (a = null);
c.bc = a;
n(b) ? (c.Tb = !0, c.vb = b) : (c.ah = !1, c.vb = '');
return c;
};
function de(a, b) {
var c = ce(a);
c.g = b;
return c;
}
function ee(a) {
var b = {};
a.ma && (b.sp = a.ec, a.Lb && (b.sn = a.xb));
a.pa && (b.ep = a.bc, a.Tb && (b.en = a.vb));
if (a.ja) {
b.l = a.ka;
var c = a.Nb;
'' === c && (c = rd(a) ? 'l' : 'r');
b.vf = c;
}
a.g !== N && (b.i = a.g.toString());
return b;
}
function S(a) {
return !(a.ma || a.pa || a.ja);
}
function fe(a) {
return S(a) && a.g == N;
}
function ge(a) {
var b = {};
if (fe(a))
return b;
var c;
a.g === N ? c = '$priority' : a.g === $d ? c = '$value' : a.g === Qd ? c = '$key' : (K(a.g instanceof Ud, 'Unrecognized index type!'), c = a.g.toString());
b.orderBy = B(c);
a.ma && (b.startAt = B(a.ec), a.Lb && (b.startAt += ',' + B(a.xb)));
a.pa && (b.endAt = B(a.bc), a.Tb && (b.endAt += ',' + B(a.vb)));
a.ja && (rd(a) ? b.limitToFirst = a.ka : b.limitToLast = a.ka);
return b;
}
g.toString = function () {
return B(ee(this));
};
function he(a, b) {
this.Bd = a;
this.dc = b;
}
he.prototype.get = function (a) {
var b = w(this.Bd, a);
if (!b)
throw Error('No index defined for ' + a);
return b === Sd ? null : b;
};
function ie(a, b, c) {
var d = na(a.Bd, function (d, f) {
var h = w(a.dc, f);
K(h, 'Missing index implementation for ' + f);
if (d === Sd) {
if (h.Ic(b.S)) {
for (var k = [], l = c.Xb(Tb), m = J(l); m;)
m.name != b.name && k.push(m), m = J(l);
k.push(b);
return je(k, td(h));
}
return Sd;
}
h = c.get(b.name);
k = d;
h && (k = k.remove(new F(b.name, h)));
return k.Oa(b, b.S);
});
return new he(d, a.dc);
}
function ke(a, b, c) {
var d = na(a.Bd, function (a) {
if (a === Sd)
return a;
var d = c.get(b.name);
return d ? a.remove(new F(b.name, d)) : a;
});
return new he(d, a.dc);
}
var le = new he({ '.priority': Sd }, { '.priority': N });
function tc(a, b) {
this.B = a;
K(n(this.B) && null !== this.B, 'LeafNode shouldn\'t be created with null/undefined value.');
this.aa = b || C;
me(this.aa);
this.Cb = null;
}
var ne = [
'object',
'boolean',
'number',
'string'
];
g = tc.prototype;
g.K = function () {
return !0;
};
g.C = function () {
return this.aa;
};
g.ga = function (a) {
return new tc(this.B, a);
};
g.R = function (a) {
return '.priority' === a ? this.aa : C;
};
g.Q = function (a) {
return a.e() ? this : '.priority' === E(a) ? this.aa : C;
};
g.Da = function () {
return !1;
};
g.rf = function () {
return null;
};
g.U = function (a, b) {
return '.priority' === a ? this.ga(b) : b.e() && '.priority' !== a ? this : C.U(a, b).ga(this.aa);
};
g.G = function (a, b) {
var c = E(a);
if (null === c)
return b;
if (b.e() && '.priority' !== c)
return this;
K('.priority' !== c || 1 === Kd(a), '.priority must be the last token in a path');
return this.U(c, C.G(H(a), b));
};
g.e = function () {
return !1;
};
g.Db = function () {
return 0;
};
g.P = function () {
return !1;
};
g.I = function (a) {
return a && !this.C().e() ? {
'.value': this.Ca(),
'.priority': this.C().I()
} : this.Ca();
};
g.hash = function () {
if (null === this.Cb) {
var a = '';
this.aa.e() || (a += 'priority:' + oe(this.aa.I()) + ':');
var b = typeof this.B, a = a + (b + ':'), a = 'number' === b ? a + Xc(this.B) : a + this.B;
this.Cb = Hc(a);
}
return this.Cb;
};
g.Ca = function () {
return this.B;
};
g.Dc = function (a) {
if (a === C)
return 1;
if (a instanceof R)
return -1;
K(a.K(), 'Unknown node type');
var b = typeof a.B, c = typeof this.B, d = Na(ne, b), e = Na(ne, c);
K(0 <= d, 'Unknown leaf type: ' + b);
K(0 <= e, 'Unknown leaf type: ' + c);
return d === e ? 'object' === c ? 0 : this.B < a.B ? -1 : this.B === a.B ? 0 : 1 : e - d;
};
g.lb = function () {
return this;
};
g.Jc = function () {
return !0;
};
g.ca = function (a) {
return a === this ? !0 : a.K() ? this.B === a.B && this.aa.ca(a.aa) : !1;
};
g.toString = function () {
return B(this.I(!0));
};
function R(a, b, c) {
this.m = a;
(this.aa = b) && me(this.aa);
a.e() && K(!this.aa || this.aa.e(), 'An empty node cannot have a priority');
this.wb = c;
this.Cb = null;
}
g = R.prototype;
g.K = function () {
return !1;
};
g.C = function () {
return this.aa || C;
};
g.ga = function (a) {
return this.m.e() ? this : new R(this.m, a, this.wb);
};
g.R = function (a) {
if ('.priority' === a)
return this.C();
a = this.m.get(a);
return null === a ? C : a;
};
g.Q = function (a) {
var b = E(a);
return null === b ? this : this.R(b).Q(H(a));
};
g.Da = function (a) {
return null !== this.m.get(a);
};
g.U = function (a, b) {
K(b, 'We should always be passing snapshot nodes');
if ('.priority' === a)
return this.ga(b);
var c = new F(a, b), d, e;
b.e() ? (d = this.m.remove(a), c = ke(this.wb, c, this.m)) : (d = this.m.Oa(a, b), c = ie(this.wb, c, this.m));
e = d.e() ? C : this.aa;
return new R(d, e, c);
};
g.G = function (a, b) {
var c = E(a);
if (null === c)
return b;
K('.priority' !== E(a) || 1 === Kd(a), '.priority must be the last token in a path');
var d = this.R(c).G(H(a), b);
return this.U(c, d);
};
g.e = function () {
return this.m.e();
};
g.Db = function () {
return this.m.count();
};
var pe = /^(0|[1-9]\d*)$/;
g = R.prototype;
g.I = function (a) {
if (this.e())
return null;
var b = {}, c = 0, d = 0, e = !0;
this.P(N, function (f, h) {
b[f] = h.I(a);
c++;
e && pe.test(f) ? d = Math.max(d, Number(f)) : e = !1;
});
if (!a && e && d < 2 * c) {
var f = [], h;
for (h in b)
f[h] = b[h];
return f;
}
a && !this.C().e() && (b['.priority'] = this.C().I());
return b;
};
g.hash = function () {
if (null === this.Cb) {
var a = '';
this.C().e() || (a += 'priority:' + oe(this.C().I()) + ':');
this.P(N, function (b, c) {
var d = c.hash();
'' !== d && (a += ':' + b + ':' + d);
});
this.Cb = '' === a ? '' : Hc(a);
}
return this.Cb;
};
g.rf = function (a, b, c) {
return (c = qe(this, c)) ? (a = cc(c, new F(a, b))) ? a.name : null : cc(this.m, a);
};
function ud(a, b) {
var c;
c = (c = qe(a, b)) ? (c = c.Sc()) && c.name : a.m.Sc();
return c ? new F(c, a.m.get(c)) : null;
}
function vd(a, b) {
var c;
c = (c = qe(a, b)) ? (c = c.fc()) && c.name : a.m.fc();
return c ? new F(c, a.m.get(c)) : null;
}
g.P = function (a, b) {
var c = qe(this, a);
return c ? c.ia(function (a) {
return b(a.name, a.S);
}) : this.m.ia(b);
};
g.Xb = function (a) {
return this.Yb(a.Tc(), a);
};
g.Yb = function (a, b) {
var c = qe(this, b);
if (c)
return c.Yb(a, function (a) {
return a;
});
for (var c = this.m.Yb(a.name, Tb), d = ec(c); null != d && 0 > b.compare(d, a);)
J(c), d = ec(c);
return c;
};
g.sf = function (a) {
return this.$b(a.Qc(), a);
};
g.$b = function (a, b) {
var c = qe(this, b);
if (c)
return c.$b(a, function (a) {
return a;
});
for (var c = this.m.$b(a.name, Tb), d = ec(c); null != d && 0 < b.compare(d, a);)
J(c), d = ec(c);
return c;
};
g.Dc = function (a) {
return this.e() ? a.e() ? 0 : -1 : a.K() || a.e() ? 1 : a === Vd ? -1 : 0;
};
g.lb = function (a) {
if (a === Qd || ta(this.wb.dc, a.toString()))
return this;
var b = this.wb, c = this.m;
K(a !== Qd, 'KeyIndex always exists and isn\'t meant to be added to the IndexMap.');
for (var d = [], e = !1, c = c.Xb(Tb), f = J(c); f;)
e = e || a.Ic(f.S), d.push(f), f = J(c);
d = e ? je(d, td(a)) : Sd;
e = a.toString();
c = xa(b.dc);
c[e] = a;
a = xa(b.Bd);
a[e] = d;
return new R(this.m, this.aa, new he(a, c));
};
g.Jc = function (a) {
return a === Qd || ta(this.wb.dc, a.toString());
};
g.ca = function (a) {
if (a === this)
return !0;
if (a.K())
return !1;
if (this.C().ca(a.C()) && this.m.count() === a.m.count()) {
var b = this.Xb(N);
a = a.Xb(N);
for (var c = J(b), d = J(a); c && d;) {
if (c.name !== d.name || !c.S.ca(d.S))
return !1;
c = J(b);
d = J(a);
}
return null === c && null === d;
}
return !1;
};
function qe(a, b) {
return b === Qd ? null : a.wb.get(b.toString());
}
g.toString = function () {
return B(this.I(!0));
};
function M(a, b) {
if (null === a)
return C;
var c = null;
'object' === typeof a && '.priority' in a ? c = a['.priority'] : 'undefined' !== typeof b && (c = b);
K(null === c || 'string' === typeof c || 'number' === typeof c || 'object' === typeof c && '.sv' in c, 'Invalid priority type found: ' + typeof c);
'object' === typeof a && '.value' in a && null !== a['.value'] && (a = a['.value']);
if ('object' !== typeof a || '.sv' in a)
return new tc(a, M(c));
if (a instanceof Array) {
var d = C, e = a;
r(e, function (a, b) {
if (v(e, b) && '.' !== b.substring(0, 1)) {
var c = M(a);
if (c.K() || !c.e())
d = d.U(b, c);
}
});
return d.ga(M(c));
}
var f = [], h = !1, k = a;
ib(k, function (a) {
if ('string' !== typeof a || '.' !== a.substring(0, 1)) {
var b = M(k[a]);
b.e() || (h = h || !b.C().e(), f.push(new F(a, b)));
}
});
if (0 == f.length)
return C;
var l = je(f, Ub, function (a) {
return a.name;
}, Wb);
if (h) {
var m = je(f, td(N));
return new R(l, M(c), new he({ '.priority': m }, { '.priority': N }));
}
return new R(l, M(c), le);
}
var re = Math.log(2);
function se(a) {
this.count = parseInt(Math.log(a + 1) / re, 10);
this.jf = this.count - 1;
this.eg = a + 1 & parseInt(Array(this.count + 1).join('1'), 2);
}
function te(a) {
var b = !(a.eg & 1 << a.jf);
a.jf--;
return b;
}
function je(a, b, c, d) {
function e(b, d) {
var f = d - b;
if (0 == f)
return null;
if (1 == f) {
var m = a[b], t = c ? c(m) : m;
return new fc(t, m.S, !1, null, null);
}
var m = parseInt(f / 2, 10) + b, f = e(b, m), z = e(m + 1, d), m = a[m], t = c ? c(m) : m;
return new fc(t, m.S, !1, f, z);
}
a.sort(b);
var f = function (b) {
function d(b, h) {
var k = t - b, z = t;
t -= b;
var z = e(k + 1, z), k = a[k], I = c ? c(k) : k, z = new fc(I, k.S, h, null, z);
f ? f.left = z : m = z;
f = z;
}
for (var f = null, m = null, t = a.length, z = 0; z < b.count; ++z) {
var I = te(b), zd = Math.pow(2, b.count - (z + 1));
I ? d(zd, !1) : (d(zd, !1), d(zd, !0));
}
return m;
}(new se(a.length));
return null !== f ? new ac(d || b, f) : new ac(d || b);
}
function oe(a) {
return 'number' === typeof a ? 'number:' + Xc(a) : 'string:' + a;
}
function me(a) {
if (a.K()) {
var b = a.I();
K('string' === typeof b || 'number' === typeof b || 'object' === typeof b && v(b, '.sv'), 'Priority must be a string or number.');
} else
K(a === Vd || a.e(), 'priority of unexpected type.');
K(a === Vd || a.C().e(), 'Priority nodes can\'t have a priority of their own.');
}
var C = new R(new ac(Wb), null, le);
function ue() {
R.call(this, new ac(Wb), C, le);
}
ma(ue, R);
g = ue.prototype;
g.Dc = function (a) {
return a === this ? 0 : 1;
};
g.ca = function (a) {
return a === this;
};
g.C = function () {
return this;
};
g.R = function () {
return C;
};
g.e = function () {
return !1;
};
var Vd = new ue(), Td = new F('[MIN_NAME]', C), Zd = new F('[MAX_NAME]', Vd);
function Id(a, b) {
this.O = a;
this.Yd = b;
}
function Fd(a, b, c, d) {
return new Id(new tb(b, c, d), a.Yd);
}
function Jd(a) {
return a.O.ea ? a.O.j() : null;
}
Id.prototype.w = function () {
return this.Yd;
};
function ub(a) {
return a.Yd.ea ? a.Yd.j() : null;
}
;
function ve(a, b) {
this.W = a;
var c = a.n, d = new kd(c.g), c = S(c) ? new kd(c.g) : c.ja ? new qd(c) : new ld(c);
this.Hf = new xd(c);
var e = b.w(), f = b.O, h = d.xa(C, e.j(), null), k = c.xa(C, f.j(), null);
this.Ka = new Id(new tb(k, f.ea, c.Na()), new tb(h, e.ea, d.Na()));
this.Xa = [];
this.lg = new cd(a);
}
function we(a) {
return a.W;
}
g = ve.prototype;
g.w = function () {
return this.Ka.w().j();
};
g.fb = function (a) {
var b = ub(this.Ka);
return b && (S(this.W.n) || !a.e() && !b.R(E(a)).e()) ? b.Q(a) : null;
};
g.e = function () {
return 0 === this.Xa.length;
};
g.Pb = function (a) {
this.Xa.push(a);
};
g.jb = function (a, b) {
var c = [];
if (b) {
K(null == a, 'A cancel should cancel all event registrations.');
var d = this.W.path;
Oa(this.Xa, function (a) {
(a = a.gf(b, d)) && c.push(a);
});
}
if (a) {
for (var e = [], f = 0; f < this.Xa.length; ++f) {
var h = this.Xa[f];
if (!h.matches(a))
e.push(h);
else if (a.tf()) {
e = e.concat(this.Xa.slice(f + 1));
break;
}
}
this.Xa = e;
} else
this.Xa = [];
return c;
};
g.ab = function (a, b, c) {
a.type === Bd && null !== a.source.Hb && (K(ub(this.Ka), 'We should always have a full cache before handling merges'), K(Jd(this.Ka), 'Missing event cache, even though we have a server cache'));
var d = this.Ka;
a = this.Hf.ab(d, a, b, c);
b = this.Hf;
c = a.je;
K(c.O.j().Jc(b.V.g), 'Event snap not indexed');
K(c.w().j().Jc(b.V.g), 'Server snap not indexed');
K(Ib(a.je.w()) || !Ib(d.w()), 'Once a server snap is complete, it should never go back');
this.Ka = a.je;
return xe(this, a.fg, a.je.O.j(), null);
};
function ye(a, b) {
var c = a.Ka.O, d = [];
c.j().K() || c.j().P(N, function (a, b) {
d.push(new D('child_added', b, a));
});
c.ea && d.push(Eb(c.j()));
return xe(a, d, c.j(), b);
}
function xe(a, b, c, d) {
return dd(a.lg, b, c, d ? [d] : a.Xa);
}
;
function ze(a, b, c) {
this.type = Bd;
this.source = a;
this.path = b;
this.children = c;
}
ze.prototype.Xc = function (a) {
if (this.path.e())
return a = this.children.subtree(new L(a)), a.e() ? null : a.value ? new Xb(this.source, G, a.value) : new ze(this.source, G, a);
K(E(this.path) === a, 'Can\'t get a merge for a child not on the path of the operation');
return new ze(this.source, H(this.path), this.children);
};
ze.prototype.toString = function () {
return 'Operation(' + this.path + ': ' + this.source.toString() + ' merge: ' + this.children.toString() + ')';
};
function Ae(a, b) {
this.f = Mc('p:rest:');
this.F = a;
this.Gb = b;
this.Aa = null;
this.$ = {};
}
function Be(a, b) {
if (n(b))
return 'tag$' + b;
K(fe(a.n), 'should have a tag if it\'s not a default query.');
return a.path.toString();
}
g = Ae.prototype;
g.yf = function (a, b, c, d) {
var e = a.path.toString();
this.f('Listen called for ' + e + ' ' + a.va());
var f = Be(a, c), h = {};
this.$[f] = h;
a = ge(a.n);
var k = this;
Ce(this, e + '.json', a, function (a, b) {
var t = b;
404 === a && (a = t = null);
null === a && k.Gb(e, t, !1, c);
w(k.$, f) === h && d(a ? 401 == a ? 'permission_denied' : 'rest_error:' + a : 'ok', null);
});
};
g.Rf = function (a, b) {
var c = Be(a, b);
delete this.$[c];
};
g.M = function (a, b) {
this.Aa = a;
var c = $c(a), d = c.data, c = c.Bc && c.Bc.exp;
b && b('ok', {
auth: d,
expires: c
});
};
g.ge = function (a) {
this.Aa = null;
a('ok', null);
};
g.Me = function () {
};
g.Cf = function () {
};
g.Jd = function () {
};
g.put = function () {
};
g.zf = function () {
};
g.Ue = function () {
};
function Ce(a, b, c, d) {
c = c || {};
c.format = 'export';
a.Aa && (c.auth = a.Aa);
var e = (a.F.kb ? 'https://' : 'http://') + a.F.host + b + '?' + kb(c);
a.f('Sending REST request for ' + e);
var f = new XMLHttpRequest();
f.onreadystatechange = function () {
if (d && 4 === f.readyState) {
a.f('REST Response for ' + e + ' received. status:', f.status, 'response:', f.responseText);
var b = null;
if (200 <= f.status && 300 > f.status) {
try {
b = nb(f.responseText);
} catch (c) {
O('Failed to parse JSON response for ' + e + ': ' + f.responseText);
}
d(null, b);
} else
401 !== f.status && 404 !== f.status && O('Got unsuccessful REST response for ' + e + ' Status: ' + f.status), d(f.status);
d = null;
}
};
f.open('GET', e, !0);
f.send();
}
;
function De(a) {
K(ea(a) && 0 < a.length, 'Requires a non-empty array');
this.Xf = a;
this.Oc = {};
}
De.prototype.fe = function (a, b) {
var c;
c = this.Oc[a] || [];
var d = c.length;
if (0 < d) {
for (var e = Array(d), f = 0; f < d; f++)
e[f] = c[f];
c = e;
} else
c = [];
for (d = 0; d < c.length; d++)
c[d].zc.apply(c[d].Ma, Array.prototype.slice.call(arguments, 1));
};
De.prototype.Eb = function (a, b, c) {
Ee(this, a);
this.Oc[a] = this.Oc[a] || [];
this.Oc[a].push({
zc: b,
Ma: c
});
(a = this.Ae(a)) && b.apply(c, a);
};
De.prototype.ic = function (a, b, c) {
Ee(this, a);
a = this.Oc[a] || [];
for (var d = 0; d < a.length; d++)
if (a[d].zc === b && (!c || c === a[d].Ma)) {
a.splice(d, 1);
break;
}
};
function Ee(a, b) {
K(Ta(a.Xf, function (a) {
return a === b;
}), 'Unknown event: ' + b);
}
;
var Fe = function () {
var a = 0, b = [];
return function (c) {
var d = c === a;
a = c;
for (var e = Array(8), f = 7; 0 <= f; f--)
e[f] = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(c % 64), c = Math.floor(c / 64);
K(0 === c, 'Cannot push at time == 0');
c = e.join('');
if (d) {
for (f = 11; 0 <= f && 63 === b[f]; f--)
b[f] = 0;
b[f]++;
} else
for (f = 0; 12 > f; f++)
b[f] = Math.floor(64 * Math.random());
for (f = 0; 12 > f; f++)
c += '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz'.charAt(b[f]);
K(20 === c.length, 'nextPushId: Length should be 20.');
return c;
};
}();
function Ge() {
De.call(this, ['online']);
this.kc = !0;
if ('undefined' !== typeof window && 'undefined' !== typeof window.addEventListener) {
var a = this;
window.addEventListener('online', function () {
a.kc || (a.kc = !0, a.fe('online', !0));
}, !1);
window.addEventListener('offline', function () {
a.kc && (a.kc = !1, a.fe('online', !1));
}, !1);
}
}
ma(Ge, De);
Ge.prototype.Ae = function (a) {
K('online' === a, 'Unknown event type: ' + a);
return [this.kc];
};
ca(Ge);
function He() {
De.call(this, ['visible']);
var a, b;
'undefined' !== typeof document && 'undefined' !== typeof document.addEventListener && ('undefined' !== typeof document.hidden ? (b = 'visibilitychange', a = 'hidden') : 'undefined' !== typeof document.mozHidden ? (b = 'mozvisibilitychange', a = 'mozHidden') : 'undefined' !== typeof document.msHidden ? (b = 'msvisibilitychange', a = 'msHidden') : 'undefined' !== typeof document.webkitHidden && (b = 'webkitvisibilitychange', a = 'webkitHidden'));
this.Ob = !0;
if (b) {
var c = this;
document.addEventListener(b, function () {
var b = !document[a];
b !== c.Ob && (c.Ob = b, c.fe('visible', b));
}, !1);
}
}
ma(He, De);
He.prototype.Ae = function (a) {
K('visible' === a, 'Unknown event type: ' + a);
return [this.Ob];
};
ca(He);
function L(a, b) {
if (1 == arguments.length) {
this.o = a.split('/');
for (var c = 0, d = 0; d < this.o.length; d++)
0 < this.o[d].length && (this.o[c] = this.o[d], c++);
this.o.length = c;
this.Z = 0;
} else
this.o = a, this.Z = b;
}
function T(a, b) {
var c = E(a);
if (null === c)
return b;
if (c === E(b))
return T(H(a), H(b));
throw Error('INTERNAL ERROR: innerPath (' + b + ') is not within outerPath (' + a + ')');
}
function Ie(a, b) {
for (var c = a.slice(), d = b.slice(), e = 0; e < c.length && e < d.length; e++) {
var f = Vb(c[e], d[e]);
if (0 !== f)
return f;
}
return c.length === d.length ? 0 : c.length < d.length ? -1 : 1;
}
function E(a) {
return a.Z >= a.o.length ? null : a.o[a.Z];
}
function Kd(a) {
return a.o.length - a.Z;
}
function H(a) {
var b = a.Z;
b < a.o.length && b++;
return new L(a.o, b);
}
function Ld(a) {
return a.Z < a.o.length ? a.o[a.o.length - 1] : null;
}
g = L.prototype;
g.toString = function () {
for (var a = '', b = this.Z; b < this.o.length; b++)
'' !== this.o[b] && (a += '/' + this.o[b]);
return a || '/';
};
g.slice = function (a) {
return this.o.slice(this.Z + (a || 0));
};
g.parent = function () {
if (this.Z >= this.o.length)
return null;
for (var a = [], b = this.Z; b < this.o.length - 1; b++)
a.push(this.o[b]);
return new L(a, 0);
};
g.u = function (a) {
for (var b = [], c = this.Z; c < this.o.length; c++)
b.push(this.o[c]);
if (a instanceof L)
for (c = a.Z; c < a.o.length; c++)
b.push(a.o[c]);
else
for (a = a.split('/'), c = 0; c < a.length; c++)
0 < a[c].length && b.push(a[c]);
return new L(b, 0);
};
g.e = function () {
return this.Z >= this.o.length;
};
g.ca = function (a) {
if (Kd(this) !== Kd(a))
return !1;
for (var b = this.Z, c = a.Z; b <= this.o.length; b++, c++)
if (this.o[b] !== a.o[c])
return !1;
return !0;
};
g.contains = function (a) {
var b = this.Z, c = a.Z;
if (Kd(this) > Kd(a))
return !1;
for (; b < this.o.length;) {
if (this.o[b] !== a.o[c])
return !1;
++b;
++c;
}
return !0;
};
var G = new L('');
function Je(a, b) {
this.Qa = a.slice();
this.Ha = Math.max(1, this.Qa.length);
this.lf = b;
for (var c = 0; c < this.Qa.length; c++)
this.Ha += Zc(this.Qa[c]);
Ke(this);
}
Je.prototype.push = function (a) {
0 < this.Qa.length && (this.Ha += 1);
this.Qa.push(a);
this.Ha += Zc(a);
Ke(this);
};
Je.prototype.pop = function () {
var a = this.Qa.pop();
this.Ha -= Zc(a);
0 < this.Qa.length && --this.Ha;
};
function Ke(a) {
if (768 < a.Ha)
throw Error(a.lf + 'has a key path longer than 768 bytes (' + a.Ha + ').');
if (32 < a.Qa.length)
throw Error(a.lf + 'path specified exceeds the maximum depth that can be written (32) or object contains a cycle ' + Le(a));
}
function Le(a) {
return 0 == a.Qa.length ? '' : 'in property \'' + a.Qa.join('.') + '\'';
}
;
function Me(a, b) {
this.value = a;
this.children = b || Ne;
}
var Ne = new ac(function (a, b) {
return a === b ? 0 : a < b ? -1 : 1;
});
function Oe(a) {
var b = Pd;
r(a, function (a, d) {
b = b.set(new L(d), a);
});
return b;
}
g = Me.prototype;
g.e = function () {
return null === this.value && this.children.e();
};
function Pe(a, b, c) {
if (null != a.value && c(a.value))
return {
path: G,
value: a.value
};
if (b.e())
return null;
var d = E(b);
a = a.children.get(d);
return null !== a ? (b = Pe(a, H(b), c), null != b ? {
path: new L(d).u(b.path),
value: b.value
} : null) : null;
}
function Qe(a, b) {
return Pe(a, b, function () {
return !0;
});
}
g.subtree = function (a) {
if (a.e())
return this;
var b = this.children.get(E(a));
return null !== b ? b.subtree(H(a)) : Pd;
};
g.set = function (a, b) {
if (a.e())
return new Me(b, this.children);
var c = E(a), d = (this.children.get(c) || Pd).set(H(a), b), c = this.children.Oa(c, d);
return new Me(this.value, c);
};
g.remove = function (a) {
if (a.e())
return this.children.e() ? Pd : new Me(null, this.children);
var b = E(a), c = this.children.get(b);
return c ? (a = c.remove(H(a)), b = a.e() ? this.children.remove(b) : this.children.Oa(b, a), null === this.value && b.e() ? Pd : new Me(this.value, b)) : this;
};
g.get = function (a) {
if (a.e())
return this.value;
var b = this.children.get(E(a));
return b ? b.get(H(a)) : null;
};
function Od(a, b, c) {
if (b.e())
return c;
var d = E(b);
b = Od(a.children.get(d) || Pd, H(b), c);
d = b.e() ? a.children.remove(d) : a.children.Oa(d, b);
return new Me(a.value, d);
}
function Re(a, b) {
return Se(a, G, b);
}
function Se(a, b, c) {
var d = {};
a.children.ia(function (a, f) {
d[a] = Se(f, b.u(a), c);
});
return c(b, a.value, d);
}
function Te(a, b, c) {
return Ue(a, b, G, c);
}
function Ue(a, b, c, d) {
var e = a.value ? d(c, a.value) : !1;
if (e)
return e;
if (b.e())
return null;
e = E(b);
return (a = a.children.get(e)) ? Ue(a, H(b), c.u(e), d) : null;
}
function Ve(a, b, c) {
var d = G;
if (!b.e()) {
var e = !0;
a.value && (e = c(d, a.value));
!0 === e && (e = E(b), (a = a.children.get(e)) && We(a, H(b), d.u(e), c));
}
}
function We(a, b, c, d) {
if (b.e())
return a;
a.value && d(c, a.value);
var e = E(b);
return (a = a.children.get(e)) ? We(a, H(b), c.u(e), d) : Pd;
}
function Md(a, b) {
Xe(a, G, b);
}
function Xe(a, b, c) {
a.children.ia(function (a, e) {
Xe(e, b.u(a), c);
});
a.value && c(b, a.value);
}
function Ye(a, b) {
a.children.ia(function (a, d) {
d.value && b(a, d.value);
});
}
var Pd = new Me(null);
Me.prototype.toString = function () {
var a = {};
Md(this, function (b, c) {
a[b.toString()] = c.toString();
});
return B(a);
};
function Ze(a, b, c) {
this.type = Ed;
this.source = $e;
this.path = a;
this.Qb = b;
this.Vd = c;
}
Ze.prototype.Xc = function (a) {
if (this.path.e()) {
if (null != this.Qb.value)
return K(this.Qb.children.e(), 'affectedTree should not have overlapping affected paths.'), this;
a = this.Qb.subtree(new L(a));
return new Ze(G, a, this.Vd);
}
K(E(this.path) === a, 'operationForChild called for unrelated child.');
return new Ze(H(this.path), this.Qb, this.Vd);
};
Ze.prototype.toString = function () {
return 'Operation(' + this.path + ': ' + this.source.toString() + ' ack write revert=' + this.Vd + ' affectedTree=' + this.Qb + ')';
};
var Yb = 0, Bd = 1, Ed = 2, $b = 3;
function af(a, b, c, d) {
this.we = a;
this.pf = b;
this.Hb = c;
this.af = d;
K(!d || b, 'Tagged queries must be from server.');
}
var $e = new af(!0, !1, null, !1), bf = new af(!1, !0, null, !1);
af.prototype.toString = function () {
return this.we ? 'user' : this.af ? 'server(queryID=' + this.Hb + ')' : 'server';
};
function cf(a) {
this.X = a;
}
var df = new cf(new Me(null));
function ef(a, b, c) {
if (b.e())
return new cf(new Me(c));
var d = Qe(a.X, b);
if (null != d) {
var e = d.path, d = d.value;
b = T(e, b);
d = d.G(b, c);
return new cf(a.X.set(e, d));
}
a = Od(a.X, b, new Me(c));
return new cf(a);
}
function ff(a, b, c) {
var d = a;
ib(c, function (a, c) {
d = ef(d, b.u(a), c);
});
return d;
}
cf.prototype.Rd = function (a) {
if (a.e())
return df;
a = Od(this.X, a, Pd);
return new cf(a);
};
function gf(a, b) {
var c = Qe(a.X, b);
return null != c ? a.X.get(c.path).Q(T(c.path, b)) : null;
}
function hf(a) {
var b = [], c = a.X.value;
null != c ? c.K() || c.P(N, function (a, c) {
b.push(new F(a, c));
}) : a.X.children.ia(function (a, c) {
null != c.value && b.push(new F(a, c.value));
});
return b;
}
function jf(a, b) {
if (b.e())
return a;
var c = gf(a, b);
return null != c ? new cf(new Me(c)) : new cf(a.X.subtree(b));
}
cf.prototype.e = function () {
return this.X.e();
};
cf.prototype.apply = function (a) {
return kf(G, this.X, a);
};
function kf(a, b, c) {
if (null != b.value)
return c.G(a, b.value);
var d = null;
b.children.ia(function (b, f) {
'.priority' === b ? (K(null !== f.value, 'Priority writes must always be leaf nodes'), d = f.value) : c = kf(a.u(b), f, c);
});
c.Q(a).e() || null === d || (c = c.G(a.u('.priority'), d));
return c;
}
;
function lf() {
this.T = df;
this.na = [];
this.Mc = -1;
}
function mf(a, b) {
for (var c = 0; c < a.na.length; c++) {
var d = a.na[c];
if (d.kd === b)
return d;
}
return null;
}
g = lf.prototype;
g.Rd = function (a) {
var b = Ua(this.na, function (b) {
return b.kd === a;
});
K(0 <= b, 'removeWrite called with nonexistent writeId.');
var c = this.na[b];
this.na.splice(b, 1);
for (var d = c.visible, e = !1, f = this.na.length - 1; d && 0 <= f;) {
var h = this.na[f];
h.visible && (f >= b && nf(h, c.path) ? d = !1 : c.path.contains(h.path) && (e = !0));
f--;
}
if (d) {
if (e)
this.T = of(this.na, pf, G), this.Mc = 0 < this.na.length ? this.na[this.na.length - 1].kd : -1;
else if (c.Ga)
this.T = this.T.Rd(c.path);
else {
var k = this;
r(c.children, function (a, b) {
k.T = k.T.Rd(c.path.u(b));
});
}
return !0;
}
return !1;
};
g.za = function (a, b, c, d) {
if (c || d) {
var e = jf(this.T, a);
return !d && e.e() ? b : d || null != b || null != gf(e, G) ? (e = of(this.na, function (b) {
return (b.visible || d) && (!c || !(0 <= Na(c, b.kd))) && (b.path.contains(a) || a.contains(b.path));
}, a), b = b || C, e.apply(b)) : null;
}
e = gf(this.T, a);
if (null != e)
return e;
e = jf(this.T, a);
return e.e() ? b : null != b || null != gf(e, G) ? (b = b || C, e.apply(b)) : null;
};
g.yc = function (a, b) {
var c = C, d = gf(this.T, a);
if (d)
d.K() || d.P(N, function (a, b) {
c = c.U(a, b);
});
else if (b) {
var e = jf(this.T, a);
b.P(N, function (a, b) {
var d = jf(e, new L(a)).apply(b);
c = c.U(a, d);
});
Oa(hf(e), function (a) {
c = c.U(a.name, a.S);
});
} else
e = jf(this.T, a), Oa(hf(e), function (a) {
c = c.U(a.name, a.S);
});
return c;
};
g.ld = function (a, b, c, d) {
K(c || d, 'Either existingEventSnap or existingServerSnap must exist');
a = a.u(b);
if (null != gf(this.T, a))
return null;
a = jf(this.T, a);
return a.e() ? d.Q(b) : a.apply(d.Q(b));
};
g.xc = function (a, b, c) {
a = a.u(b);
var d = gf(this.T, a);
return null != d ? d : sb(c, b) ? jf(this.T, a).apply(c.j().R(b)) : null;
};
g.tc = function (a) {
return gf(this.T, a);
};
g.ne = function (a, b, c, d, e, f) {
var h;
a = jf(this.T, a);
h = gf(a, G);
if (null == h)
if (null != b)
h = a.apply(b);
else
return [];
h = h.lb(f);
if (h.e() || h.K())
return [];
b = [];
a = td(f);
e = e ? h.$b(c, f) : h.Yb(c, f);
for (f = J(e); f && b.length < d;)
0 !== a(f, c) && b.push(f), f = J(e);
return b;
};
function nf(a, b) {
return a.Ga ? a.path.contains(b) : !!ua(a.children, function (c, d) {
return a.path.u(d).contains(b);
});
}
function pf(a) {
return a.visible;
}
function of(a, b, c) {
for (var d = df, e = 0; e < a.length; ++e) {
var f = a[e];
if (b(f)) {
var h = f.path;
if (f.Ga)
c.contains(h) ? (h = T(c, h), d = ef(d, h, f.Ga)) : h.contains(c) && (h = T(h, c), d = ef(d, G, f.Ga.Q(h)));
else if (f.children)
if (c.contains(h))
h = T(c, h), d = ff(d, h, f.children);
else {
if (h.contains(c))
if (h = T(h, c), h.e())
d = ff(d, G, f.children);
else if (f = w(f.children, E(h)))
f = f.Q(H(h)), d = ef(d, G, f);
}
else
throw Fc('WriteRecord should have .snap or .children');
}
}
return d;
}
function qf(a, b) {
this.Mb = a;
this.X = b;
}
g = qf.prototype;
g.za = function (a, b, c) {
return this.X.za(this.Mb, a, b, c);
};
g.yc = function (a) {
return this.X.yc(this.Mb, a);
};
g.ld = function (a, b, c) {
return this.X.ld(this.Mb, a, b, c);
};
g.tc = function (a) {
return this.X.tc(this.Mb.u(a));
};
g.ne = function (a, b, c, d, e) {
return this.X.ne(this.Mb, a, b, c, d, e);
};
g.xc = function (a, b) {
return this.X.xc(this.Mb, a, b);
};
g.u = function (a) {
return new qf(this.Mb.u(a), this.X);
};
function rf() {
this.ya = {};
}
g = rf.prototype;
g.e = function () {
return wa(this.ya);
};
g.ab = function (a, b, c) {
var d = a.source.Hb;
if (null !== d)
return d = w(this.ya, d), K(null != d, 'SyncTree gave us an op for an invalid query.'), d.ab(a, b, c);
var e = [];
r(this.ya, function (d) {
e = e.concat(d.ab(a, b, c));
});
return e;
};
g.Pb = function (a, b, c, d, e) {
var f = a.va(), h = w(this.ya, f);
if (!h) {
var h = c.za(e ? d : null), k = !1;
h ? k = !0 : (h = d instanceof R ? c.yc(d) : C, k = !1);
h = new ve(a, new Id(new tb(h, k, !1), new tb(d, e, !1)));
this.ya[f] = h;
}
h.Pb(b);
return ye(h, b);
};
g.jb = function (a, b, c) {
var d = a.va(), e = [], f = [], h = null != sf(this);
if ('default' === d) {
var k = this;
r(this.ya, function (a, d) {
f = f.concat(a.jb(b, c));
a.e() && (delete k.ya[d], S(a.W.n) || e.push(a.W));
});
} else {
var l = w(this.ya, d);
l && (f = f.concat(l.jb(b, c)), l.e() && (delete this.ya[d], S(l.W.n) || e.push(l.W)));
}
h && null == sf(this) && e.push(new U(a.k, a.path));
return {
Kg: e,
mg: f
};
};
function tf(a) {
return Pa(ra(a.ya), function (a) {
return !S(a.W.n);
});
}
g.fb = function (a) {
var b = null;
r(this.ya, function (c) {
b = b || c.fb(a);
});
return b;
};
function uf(a, b) {
if (S(b.n))
return sf(a);
var c = b.va();
return w(a.ya, c);
}
function sf(a) {
return va(a.ya, function (a) {
return S(a.W.n);
}) || null;
}
;
function vf(a) {
this.ta = Pd;
this.ib = new lf();
this.$e = {};
this.mc = {};
this.Nc = a;
}
function wf(a, b, c, d, e) {
var f = a.ib, h = e;
K(d > f.Mc, 'Stacking an older write on top of newer ones');
n(h) || (h = !0);
f.na.push({
path: b,
Ga: c,
kd: d,
visible: h
});
h && (f.T = ef(f.T, b, c));
f.Mc = d;
return e ? xf(a, new Xb($e, b, c)) : [];
}
function yf(a, b, c, d) {
var e = a.ib;
K(d > e.Mc, 'Stacking an older merge on top of newer ones');
e.na.push({
path: b,
children: c,
kd: d,
visible: !0
});
e.T = ff(e.T, b, c);
e.Mc = d;
c = Oe(c);
return xf(a, new ze($e, b, c));
}
function zf(a, b, c) {
c = c || !1;
var d = mf(a.ib, b);
if (a.ib.Rd(b)) {
var e = Pd;
null != d.Ga ? e = e.set(G, !0) : ib(d.children, function (a, b) {
e = e.set(new L(a), b);
});
return xf(a, new Ze(d.path, e, c));
}
return [];
}
function Af(a, b, c) {
c = Oe(c);
return xf(a, new ze(bf, b, c));
}
function Bf(a, b, c, d) {
d = Cf(a, d);
if (null != d) {
var e = Df(d);
d = e.path;
e = e.Hb;
b = T(d, b);
c = new Xb(new af(!1, !0, e, !0), b, c);
return Ef(a, d, c);
}
return [];
}
function Ff(a, b, c, d) {
if (d = Cf(a, d)) {
var e = Df(d);
d = e.path;
e = e.Hb;
b = T(d, b);
c = Oe(c);
c = new ze(new af(!1, !0, e, !0), b, c);
return Ef(a, d, c);
}
return [];
}
vf.prototype.Pb = function (a, b) {
var c = a.path, d = null, e = !1;
Ve(this.ta, c, function (a, b) {
var f = T(a, c);
d = b.fb(f);
e = e || null != sf(b);
return !d;
});
var f = this.ta.get(c);
f ? (e = e || null != sf(f), d = d || f.fb(G)) : (f = new rf(), this.ta = this.ta.set(c, f));
var h;
null != d ? h = !0 : (h = !1, d = C, Ye(this.ta.subtree(c), function (a, b) {
var c = b.fb(G);
c && (d = d.U(a, c));
}));
var k = null != uf(f, a);
if (!k && !S(a.n)) {
var l = Gf(a);
K(!(l in this.mc), 'View does not exist, but we have a tag');
var m = Hf++;
this.mc[l] = m;
this.$e['_' + m] = l;
}
h = f.Pb(a, b, new qf(c, this.ib), d, h);
k || e || (f = uf(f, a), h = h.concat(If(this, a, f)));
return h;
};
vf.prototype.jb = function (a, b, c) {
var d = a.path, e = this.ta.get(d), f = [];
if (e && ('default' === a.va() || null != uf(e, a))) {
f = e.jb(a, b, c);
e.e() && (this.ta = this.ta.remove(d));
e = f.Kg;
f = f.mg;
b = -1 !== Ua(e, function (a) {
return S(a.n);
});
var h = Te(this.ta, d, function (a, b) {
return null != sf(b);
});
if (b && !h && (d = this.ta.subtree(d), !d.e()))
for (var d = Jf(d), k = 0; k < d.length; ++k) {
var l = d[k], m = l.W, l = Kf(this, l);
this.Nc.Xe(Lf(m), Mf(this, m), l.xd, l.H);
}
if (!h && 0 < e.length && !c)
if (b)
this.Nc.ae(Lf(a), null);
else {
var t = this;
Oa(e, function (a) {
a.va();
var b = t.mc[Gf(a)];
t.Nc.ae(Lf(a), b);
});
}
Nf(this, e);
}
return f;
};
vf.prototype.za = function (a, b) {
var c = this.ib, d = Te(this.ta, a, function (b, c) {
var d = T(b, a);
if (d = c.fb(d))
return d;
});
return c.za(a, d, b, !0);
};
function Jf(a) {
return Re(a, function (a, c, d) {
if (c && null != sf(c))
return [sf(c)];
var e = [];
c && (e = tf(c));
r(d, function (a) {
e = e.concat(a);
});
return e;
});
}
function Nf(a, b) {
for (var c = 0; c < b.length; ++c) {
var d = b[c];
if (!S(d.n)) {
var d = Gf(d), e = a.mc[d];
delete a.mc[d];
delete a.$e['_' + e];
}
}
}
function Lf(a) {
return S(a.n) && !fe(a.n) ? a.Ib() : a;
}
function If(a, b, c) {
var d = b.path, e = Mf(a, b);
c = Kf(a, c);
b = a.Nc.Xe(Lf(b), e, c.xd, c.H);
d = a.ta.subtree(d);
if (e)
K(null == sf(d.value), 'If we\'re adding a query, it shouldn\'t be shadowed');
else
for (e = Re(d, function (a, b, c) {
if (!a.e() && b && null != sf(b))
return [we(sf(b))];
var d = [];
b && (d = d.concat(Qa(tf(b), function (a) {
return a.W;
})));
r(c, function (a) {
d = d.concat(a);
});
return d;
}), d = 0; d < e.length; ++d)
c = e[d], a.Nc.ae(Lf(c), Mf(a, c));
return b;
}
function Kf(a, b) {
var c = b.W, d = Mf(a, c);
return {
xd: function () {
return (b.w() || C).hash();
},
H: function (b) {
if ('ok' === b) {
if (d) {
var f = c.path;
if (b = Cf(a, d)) {
var h = Df(b);
b = h.path;
h = h.Hb;
f = T(b, f);
f = new Zb(new af(!1, !0, h, !0), f);
b = Ef(a, b, f);
} else
b = [];
} else
b = xf(a, new Zb(bf, c.path));
return b;
}
f = 'Unknown Error';
'too_big' === b ? f = 'The data requested exceeds the maximum size that can be accessed with a single request.' : 'permission_denied' == b ? f = 'Client doesn\'t have permission to access the desired data.' : 'unavailable' == b && (f = 'The service is unavailable');
f = Error(b + ': ' + f);
f.code = b.toUpperCase();
return a.jb(c, null, f);
}
};
}
function Gf(a) {
return a.path.toString() + '$' + a.va();
}
function Df(a) {
var b = a.indexOf('$');
K(-1 !== b && b < a.length - 1, 'Bad queryKey.');
return {
Hb: a.substr(b + 1),
path: new L(a.substr(0, b))
};
}
function Cf(a, b) {
var c = a.$e, d = '_' + b;
return d in c ? c[d] : void 0;
}
function Mf(a, b) {
var c = Gf(b);
return w(a.mc, c);
}
var Hf = 1;
function Ef(a, b, c) {
var d = a.ta.get(b);
K(d, 'Missing sync point for query tag that we\'re tracking');
return d.ab(c, new qf(b, a.ib), null);
}
function xf(a, b) {
return Of(a, b, a.ta, null, new qf(G, a.ib));
}
function Of(a, b, c, d, e) {
if (b.path.e())
return Pf(a, b, c, d, e);
var f = c.get(G);
null == d && null != f && (d = f.fb(G));
var h = [], k = E(b.path), l = b.Xc(k);
if ((c = c.children.get(k)) && l)
var m = d ? d.R(k) : null, k = e.u(k), h = h.concat(Of(a, l, c, m, k));
f && (h = h.concat(f.ab(b, e, d)));
return h;
}
function Pf(a, b, c, d, e) {
var f = c.get(G);
null == d && null != f && (d = f.fb(G));
var h = [];
c.children.ia(function (c, f) {
var m = d ? d.R(c) : null, t = e.u(c), z = b.Xc(c);
z && (h = h.concat(Pf(a, z, f, m, t)));
});
f && (h = h.concat(f.ab(b, e, d)));
return h;
}
;
function Qf() {
this.children = {};
this.nd = 0;
this.value = null;
}
function Rf(a, b, c) {
this.Gd = a ? a : '';
this.Zc = b ? b : null;
this.A = c ? c : new Qf();
}
function Sf(a, b) {
for (var c = b instanceof L ? b : new L(b), d = a, e; null !== (e = E(c));)
d = new Rf(e, d, w(d.A.children, e) || new Qf()), c = H(c);
return d;
}
g = Rf.prototype;
g.Ca = function () {
return this.A.value;
};
function Tf(a, b) {
K('undefined' !== typeof b, 'Cannot set value to undefined');
a.A.value = b;
Uf(a);
}
g.clear = function () {
this.A.value = null;
this.A.children = {};
this.A.nd = 0;
Uf(this);
};
g.wd = function () {
return 0 < this.A.nd;
};
g.e = function () {
return null === this.Ca() && !this.wd();
};
g.P = function (a) {
var b = this;
r(this.A.children, function (c, d) {
a(new Rf(d, b, c));
});
};
function Vf(a, b, c, d) {
c && !d && b(a);
a.P(function (a) {
Vf(a, b, !0, d);
});
c && d && b(a);
}
function Wf(a, b) {
for (var c = a.parent(); null !== c && !b(c);)
c = c.parent();
}
g.path = function () {
return new L(null === this.Zc ? this.Gd : this.Zc.path() + '/' + this.Gd);
};
g.name = function () {
return this.Gd;
};
g.parent = function () {
return this.Zc;
};
function Uf(a) {
if (null !== a.Zc) {
var b = a.Zc, c = a.Gd, d = a.e(), e = v(b.A.children, c);
d && e ? (delete b.A.children[c], b.A.nd--, Uf(b)) : d || e || (b.A.children[c] = a.A, b.A.nd++, Uf(b));
}
}
;
var Xf = /[\[\].#$\/\u0000-\u001F\u007F]/, Yf = /[\[\].#$\u0000-\u001F\u007F]/, Zf = /^[a-zA-Z][a-zA-Z._\-+]+$/;
function $f(a) {
return p(a) && 0 !== a.length && !Xf.test(a);
}
function ag(a) {
return null === a || p(a) || ga(a) && !Qc(a) || ia(a) && v(a, '.sv');
}
function bg(a, b, c, d) {
d && !n(b) || cg(y(a, 1, d), b, c);
}
function cg(a, b, c) {
c instanceof L && (c = new Je(c, a));
if (!n(b))
throw Error(a + 'contains undefined ' + Le(c));
if (ha(b))
throw Error(a + 'contains a function ' + Le(c) + ' with contents: ' + b.toString());
if (Qc(b))
throw Error(a + 'contains ' + b.toString() + ' ' + Le(c));
if (p(b) && b.length > 10485760 / 3 && 10485760 < Zc(b))
throw Error(a + 'contains a string greater than 10485760 utf8 bytes ' + Le(c) + ' (\'' + b.substring(0, 50) + '...\')');
if (ia(b)) {
var d = !1, e = !1;
ib(b, function (b, h) {
if ('.value' === b)
d = !0;
else if ('.priority' !== b && '.sv' !== b && (e = !0, !$f(b)))
throw Error(a + ' contains an invalid key (' + b + ') ' + Le(c) + '.  Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');
c.push(b);
cg(a, h, c);
c.pop();
});
if (d && e)
throw Error(a + ' contains ".value" child ' + Le(c) + ' in addition to actual children.');
}
}
function dg(a, b) {
var c, d;
for (c = 0; c < b.length; c++) {
d = b[c];
for (var e = d.slice(), f = 0; f < e.length; f++)
if (('.priority' !== e[f] || f !== e.length - 1) && !$f(e[f]))
throw Error(a + 'contains an invalid key (' + e[f] + ') in path ' + d.toString() + '. Keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]"');
}
b.sort(Ie);
e = null;
for (c = 0; c < b.length; c++) {
d = b[c];
if (null !== e && e.contains(d))
throw Error(a + 'contains a path ' + e.toString() + ' that is ancestor of another path ' + d.toString());
e = d;
}
}
function eg(a, b, c) {
var d = y(a, 1, !1);
if (!ia(b) || ea(b))
throw Error(d + ' must be an object containing the children to replace.');
var e = [];
ib(b, function (a, b) {
var k = new L(a);
cg(d, b, c.u(k));
if ('.priority' === Ld(k) && !ag(b))
throw Error(d + 'contains an invalid value for \'' + k.toString() + '\', which must be a valid Firebase priority (a string, finite number, server value, or null).');
e.push(k);
});
dg(d, e);
}
function fg(a, b, c) {
if (Qc(c))
throw Error(y(a, b, !1) + 'is ' + c.toString() + ', but must be a valid Firebase priority (a string, finite number, server value, or null).');
if (!ag(c))
throw Error(y(a, b, !1) + 'must be a valid Firebase priority (a string, finite number, server value, or null).');
}
function gg(a, b, c) {
if (!c || n(b))
switch (b) {
case 'value':
case 'child_added':
case 'child_removed':
case 'child_changed':
case 'child_moved':
break;
default:
throw Error(y(a, 1, c) + 'must be a valid event type: "value", "child_added", "child_removed", "child_changed", or "child_moved".');
}
}
function hg(a, b) {
if (n(b) && !$f(b))
throw Error(y(a, 2, !0) + 'was an invalid key: "' + b + '".  Firebase keys must be non-empty strings and can\'t contain ".", "#", "$", "/", "[", or "]").');
}
function ig(a, b) {
if (!p(b) || 0 === b.length || Yf.test(b))
throw Error(y(a, 1, !1) + 'was an invalid path: "' + b + '". Paths must be non-empty strings and can\'t contain ".", "#", "$", "[", or "]"');
}
function jg(a, b) {
if ('.info' === E(b))
throw Error(a + ' failed: Can\'t modify data under /.info/');
}
function kg(a, b) {
if (!p(b))
throw Error(y(a, 1, !1) + 'must be a valid credential (a string).');
}
function lg(a, b, c) {
if (!p(c))
throw Error(y(a, b, !1) + 'must be a valid string.');
}
function mg(a, b) {
lg(a, 1, b);
if (!Zf.test(b))
throw Error(y(a, 1, !1) + '\'' + b + '\' is not a valid authentication provider.');
}
function ng(a, b, c, d) {
if (!d || n(c))
if (!ia(c) || null === c)
throw Error(y(a, b, d) + 'must be a valid object.');
}
function og(a, b, c) {
if (!ia(b) || !v(b, c))
throw Error(y(a, 1, !1) + 'must contain the key "' + c + '"');
if (!p(w(b, c)))
throw Error(y(a, 1, !1) + 'must contain the key "' + c + '" with type "string"');
}
;
function pg() {
this.set = {};
}
g = pg.prototype;
g.add = function (a, b) {
this.set[a] = null !== b ? b : !0;
};
g.contains = function (a) {
return v(this.set, a);
};
g.get = function (a) {
return this.contains(a) ? this.set[a] : void 0;
};
g.remove = function (a) {
delete this.set[a];
};
g.clear = function () {
this.set = {};
};
g.e = function () {
return wa(this.set);
};
g.count = function () {
return pa(this.set);
};
function qg(a, b) {
r(a.set, function (a, d) {
b(d, a);
});
}
g.keys = function () {
var a = [];
r(this.set, function (b, c) {
a.push(c);
});
return a;
};
function qc() {
this.m = this.B = null;
}
qc.prototype.find = function (a) {
if (null != this.B)
return this.B.Q(a);
if (a.e() || null == this.m)
return null;
var b = E(a);
a = H(a);
return this.m.contains(b) ? this.m.get(b).find(a) : null;
};
qc.prototype.nc = function (a, b) {
if (a.e())
this.B = b, this.m = null;
else if (null !== this.B)
this.B = this.B.G(a, b);
else {
null == this.m && (this.m = new pg());
var c = E(a);
this.m.contains(c) || this.m.add(c, new qc());
c = this.m.get(c);
a = H(a);
c.nc(a, b);
}
};
function rg(a, b) {
if (b.e())
return a.B = null, a.m = null, !0;
if (null !== a.B) {
if (a.B.K())
return !1;
var c = a.B;
a.B = null;
c.P(N, function (b, c) {
a.nc(new L(b), c);
});
return rg(a, b);
}
return null !== a.m ? (c = E(b), b = H(b), a.m.contains(c) && rg(a.m.get(c), b) && a.m.remove(c), a.m.e() ? (a.m = null, !0) : !1) : !0;
}
function rc(a, b, c) {
null !== a.B ? c(b, a.B) : a.P(function (a, e) {
var f = new L(b.toString() + '/' + a);
rc(e, f, c);
});
}
qc.prototype.P = function (a) {
null !== this.m && qg(this.m, function (b, c) {
a(b, c);
});
};
var sg = 'auth.firebase.com';
function tg(a, b, c) {
this.od = a || {};
this.ee = b || {};
this.$a = c || {};
this.od.remember || (this.od.remember = 'default');
}
var ug = [
'remember',
'redirectTo'
];
function vg(a) {
var b = {}, c = {};
ib(a || {}, function (a, e) {
0 <= Na(ug, a) ? b[a] = e : c[a] = e;
});
return new tg(b, {}, c);
}
;
function wg(a, b) {
this.Qe = [
'session',
a.Od,
a.hc
].join(':');
this.be = b;
}
wg.prototype.set = function (a, b) {
if (!b)
if (this.be.length)
b = this.be[0];
else
throw Error('fb.login.SessionManager : No storage options available!');
b.set(this.Qe, a);
};
wg.prototype.get = function () {
var a = Qa(this.be, q(this.qg, this)), a = Pa(a, function (a) {
return null !== a;
});
Xa(a, function (a, c) {
return ad(c.token) - ad(a.token);
});
return 0 < a.length ? a.shift() : null;
};
wg.prototype.qg = function (a) {
try {
var b = a.get(this.Qe);
if (b && b.token)
return b;
} catch (c) {
}
return null;
};
wg.prototype.clear = function () {
var a = this;
Oa(this.be, function (b) {
b.remove(a.Qe);
});
};
function xg() {
return 'undefined' !== typeof navigator && 'string' === typeof navigator.userAgent ? navigator.userAgent : '';
}
function yg() {
return 'undefined' !== typeof window && !!(window.cordova || window.phonegap || window.PhoneGap) && /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(xg());
}
function zg() {
return 'undefined' !== typeof location && /^file:\//.test(location.href);
}
function Ag(a) {
var b = xg();
if ('' === b)
return !1;
if ('Microsoft Internet Explorer' === navigator.appName) {
if ((b = b.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/)) && 1 < b.length)
return parseFloat(b[1]) >= a;
} else if (-1 < b.indexOf('Trident') && (b = b.match(/rv:([0-9]{2,2}[\.0-9]{0,})/)) && 1 < b.length)
return parseFloat(b[1]) >= a;
return !1;
}
;
function Bg() {
var a = window.opener.frames, b;
for (b = a.length - 1; 0 <= b; b--)
try {
if (a[b].location.protocol === window.location.protocol && a[b].location.host === window.location.host && '__winchan_relay_frame' === a[b].name)
return a[b];
} catch (c) {
}
return null;
}
function Cg(a, b, c) {
a.attachEvent ? a.attachEvent('on' + b, c) : a.addEventListener && a.addEventListener(b, c, !1);
}
function Dg(a, b, c) {
a.detachEvent ? a.detachEvent('on' + b, c) : a.removeEventListener && a.removeEventListener(b, c, !1);
}
function Eg(a) {
/^https?:\/\//.test(a) || (a = window.location.href);
var b = /^(https?:\/\/[\-_a-zA-Z\.0-9:]+)/.exec(a);
return b ? b[1] : a;
}
function Fg(a) {
var b = '';
try {
a = a.replace('#', '');
var c = lb(a);
c && v(c, '__firebase_request_key') && (b = w(c, '__firebase_request_key'));
} catch (d) {
}
return b;
}
function Gg() {
var a = Pc(sg);
return a.scheme + '://' + a.host + '/v2';
}
function Hg(a) {
return Gg() + '/' + a + '/auth/channel';
}
;
function Ig(a) {
var b = this;
this.Ac = a;
this.ce = '*';
Ag(8) ? this.Rc = this.zd = Bg() : (this.Rc = window.opener, this.zd = window);
if (!b.Rc)
throw 'Unable to find relay frame';
Cg(this.zd, 'message', q(this.jc, this));
Cg(this.zd, 'message', q(this.Bf, this));
try {
Jg(this, { a: 'ready' });
} catch (c) {
Cg(this.Rc, 'load', function () {
Jg(b, { a: 'ready' });
});
}
Cg(window, 'unload', q(this.Bg, this));
}
function Jg(a, b) {
b = B(b);
Ag(8) ? a.Rc.doPost(b, a.ce) : a.Rc.postMessage(b, a.ce);
}
Ig.prototype.jc = function (a) {
var b = this, c;
try {
c = nb(a.data);
} catch (d) {
}
c && 'request' === c.a && (Dg(window, 'message', this.jc), this.ce = a.origin, this.Ac && setTimeout(function () {
b.Ac(b.ce, c.d, function (a, c) {
b.dg = !c;
b.Ac = void 0;
Jg(b, {
a: 'response',
d: a,
forceKeepWindowOpen: c
});
});
}, 0));
};
Ig.prototype.Bg = function () {
try {
Dg(this.zd, 'message', this.Bf);
} catch (a) {
}
this.Ac && (Jg(this, {
a: 'error',
d: 'unknown closed window'
}), this.Ac = void 0);
try {
window.close();
} catch (b) {
}
};
Ig.prototype.Bf = function (a) {
if (this.dg && 'die' === a.data)
try {
window.close();
} catch (b) {
}
};
function Kg(a) {
this.pc = Ga() + Ga() + Ga();
this.Ef = a;
}
Kg.prototype.open = function (a, b) {
yc.set('redirect_request_id', this.pc);
yc.set('redirect_request_id', this.pc);
b.requestId = this.pc;
b.redirectTo = b.redirectTo || window.location.href;
a += (/\?/.test(a) ? '' : '?') + kb(b);
window.location = a;
};
Kg.isAvailable = function () {
return !zg() && !yg();
};
Kg.prototype.Cc = function () {
return 'redirect';
};
var Lg = {
NETWORK_ERROR: 'Unable to contact the Firebase server.',
SERVER_ERROR: 'An unknown server error occurred.',
TRANSPORT_UNAVAILABLE: 'There are no login transports available for the requested method.',
REQUEST_INTERRUPTED: 'The browser redirected the page before the login request could complete.',
USER_CANCELLED: 'The user cancelled authentication.'
};
function Mg(a) {
var b = Error(w(Lg, a), a);
b.code = a;
return b;
}
;
function Ng(a) {
var b;
(b = !a.window_features) || (b = xg(), b = -1 !== b.indexOf('Fennec/') || -1 !== b.indexOf('Firefox/') && -1 !== b.indexOf('Android'));
b && (a.window_features = void 0);
a.window_name || (a.window_name = '_blank');
this.options = a;
}
Ng.prototype.open = function (a, b, c) {
function d(a) {
h && (document.body.removeChild(h), h = void 0);
t && (t = clearInterval(t));
Dg(window, 'message', e);
Dg(window, 'unload', d);
if (m && !a)
try {
m.close();
} catch (b) {
k.postMessage('die', l);
}
m = k = void 0;
}
function e(a) {
if (a.origin === l)
try {
var b = nb(a.data);
'ready' === b.a ? k.postMessage(z, l) : 'error' === b.a ? (d(!1), c && (c(b.d), c = null)) : 'response' === b.a && (d(b.forceKeepWindowOpen), c && (c(null, b.d), c = null));
} catch (e) {
}
}
var f = Ag(8), h, k;
if (!this.options.relay_url)
return c(Error('invalid arguments: origin of url and relay_url must match'));
var l = Eg(a);
if (l !== Eg(this.options.relay_url))
c && setTimeout(function () {
c(Error('invalid arguments: origin of url and relay_url must match'));
}, 0);
else {
f && (h = document.createElement('iframe'), h.setAttribute('src', this.options.relay_url), h.style.display = 'none', h.setAttribute('name', '__winchan_relay_frame'), document.body.appendChild(h), k = h.contentWindow);
a += (/\?/.test(a) ? '' : '?') + kb(b);
var m = window.open(a, this.options.window_name, this.options.window_features);
k || (k = m);
var t = setInterval(function () {
m && m.closed && (d(!1), c && (c(Mg('USER_CANCELLED')), c = null));
}, 500), z = B({
a: 'request',
d: b
});
Cg(window, 'unload', d);
Cg(window, 'message', e);
}
};
Ng.isAvailable = function () {
var a;
if (a = 'postMessage' in window && !zg())
(a = yg() || 'undefined' !== typeof navigator && (!!xg().match(/Windows Phone/) || !!window.Windows && /^ms-appx:/.test(location.href))) || (a = xg(), a = 'undefined' !== typeof navigator && 'undefined' !== typeof window && !!(a.match(/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i) || a.match(/CriOS/) || a.match(/Twitter for iPhone/) || a.match(/FBAN\/FBIOS/) || window.navigator.standalone)), a = !a;
return a && !xg().match(/PhantomJS/);
};
Ng.prototype.Cc = function () {
return 'popup';
};
function Og(a) {
a.method || (a.method = 'GET');
a.headers || (a.headers = {});
a.headers.content_type || (a.headers.content_type = 'application/json');
a.headers.content_type = a.headers.content_type.toLowerCase();
this.options = a;
}
Og.prototype.open = function (a, b, c) {
function d() {
c && (c(Mg('REQUEST_INTERRUPTED')), c = null);
}
var e = new XMLHttpRequest(), f = this.options.method.toUpperCase(), h;
Cg(window, 'beforeunload', d);
e.onreadystatechange = function () {
if (c && 4 === e.readyState) {
var a;
if (200 <= e.status && 300 > e.status) {
try {
a = nb(e.responseText);
} catch (b) {
}
c(null, a);
} else
500 <= e.status && 600 > e.status ? c(Mg('SERVER_ERROR')) : c(Mg('NETWORK_ERROR'));
c = null;
Dg(window, 'beforeunload', d);
}
};
if ('GET' === f)
a += (/\?/.test(a) ? '' : '?') + kb(b), h = null;
else {
var k = this.options.headers.content_type;
'application/json' === k && (h = B(b));
'application/x-www-form-urlencoded' === k && (h = kb(b));
}
e.open(f, a, !0);
a = {
'X-Requested-With': 'XMLHttpRequest',
Accept: 'application/json;text/plain'
};
za(a, this.options.headers);
for (var l in a)
e.setRequestHeader(l, a[l]);
e.send(h);
};
Og.isAvailable = function () {
var a;
if (a = !!window.XMLHttpRequest)
a = xg(), a = !(a.match(/MSIE/) || a.match(/Trident/)) || Ag(10);
return a;
};
Og.prototype.Cc = function () {
return 'json';
};
function Pg(a) {
this.pc = Ga() + Ga() + Ga();
this.Ef = a;
}
Pg.prototype.open = function (a, b, c) {
function d() {
c && (c(Mg('USER_CANCELLED')), c = null);
}
var e = this, f = Pc(sg), h;
b.requestId = this.pc;
b.redirectTo = f.scheme + '://' + f.host + '/blank/page.html';
a += /\?/.test(a) ? '' : '?';
a += kb(b);
(h = window.open(a, '_blank', 'location=no')) && ha(h.addEventListener) ? (h.addEventListener('loadstart', function (a) {
var b;
if (b = a && a.url)
a: {
try {
var m = document.createElement('a');
m.href = a.url;
b = m.host === f.host && '/blank/page.html' === m.pathname;
break a;
} catch (t) {
}
b = !1;
}
b && (a = Fg(a.url), h.removeEventListener('exit', d), h.close(), a = new tg(null, null, {
requestId: e.pc,
requestKey: a
}), e.Ef.requestWithCredential('/auth/session', a, c), c = null);
}), h.addEventListener('exit', d)) : c(Mg('TRANSPORT_UNAVAILABLE'));
};
Pg.isAvailable = function () {
return yg();
};
Pg.prototype.Cc = function () {
return 'redirect';
};
function Qg(a) {
a.callback_parameter || (a.callback_parameter = 'callback');
this.options = a;
window.__firebase_auth_jsonp = window.__firebase_auth_jsonp || {};
}
Qg.prototype.open = function (a, b, c) {
function d() {
c && (c(Mg('REQUEST_INTERRUPTED')), c = null);
}
function e() {
setTimeout(function () {
window.__firebase_auth_jsonp[f] = void 0;
wa(window.__firebase_auth_jsonp) && (window.__firebase_auth_jsonp = void 0);
try {
var a = document.getElementById(f);
a && a.parentNode.removeChild(a);
} catch (b) {
}
}, 1);
Dg(window, 'beforeunload', d);
}
var f = 'fn' + new Date().getTime() + Math.floor(99999 * Math.random());
b[this.options.callback_parameter] = '__firebase_auth_jsonp.' + f;
a += (/\?/.test(a) ? '' : '?') + kb(b);
Cg(window, 'beforeunload', d);
window.__firebase_auth_jsonp[f] = function (a) {
c && (c(null, a), c = null);
e();
};
Rg(f, a, c);
};
function Rg(a, b, c) {
setTimeout(function () {
try {
var d = document.createElement('script');
d.type = 'text/javascript';
d.id = a;
d.async = !0;
d.src = b;
d.onerror = function () {
var b = document.getElementById(a);
null !== b && b.parentNode.removeChild(b);
c && c(Mg('NETWORK_ERROR'));
};
var e = document.getElementsByTagName('head');
(e && 0 != e.length ? e[0] : document.documentElement).appendChild(d);
} catch (f) {
c && c(Mg('NETWORK_ERROR'));
}
}, 0);
}
Qg.isAvailable = function () {
return 'undefined' !== typeof document && null != document.createElement;
};
Qg.prototype.Cc = function () {
return 'json';
};
function Sg(a, b, c, d) {
De.call(this, ['auth_status']);
this.F = a;
this.df = b;
this.Vg = c;
this.Le = d;
this.sc = new wg(a, [
xc,
yc
]);
this.mb = null;
this.Se = !1;
Tg(this);
}
ma(Sg, De);
g = Sg.prototype;
g.xe = function () {
return this.mb || null;
};
function Tg(a) {
yc.get('redirect_request_id') && Ug(a);
var b = a.sc.get();
b && b.token ? (Vg(a, b), a.df(b.token, function (c, d) {
Wg(a, c, d, !1, b.token, b);
}, function (b, d) {
Xg(a, 'resumeSession()', b, d);
})) : Vg(a, null);
}
function Yg(a, b, c, d, e, f) {
'firebaseio-demo.com' === a.F.domain && O('Firebase authentication is not supported on demo Firebases (*.firebaseio-demo.com). To secure your Firebase, create a production Firebase at https://www.firebase.com.');
a.df(b, function (f, k) {
Wg(a, f, k, !0, b, c, d || {}, e);
}, function (b, c) {
Xg(a, 'auth()', b, c, f);
});
}
function Zg(a, b) {
a.sc.clear();
Vg(a, null);
a.Vg(function (a, d) {
if ('ok' === a)
P(b, null);
else {
var e = (a || 'error').toUpperCase(), f = e;
d && (f += ': ' + d);
f = Error(f);
f.code = e;
P(b, f);
}
});
}
function Wg(a, b, c, d, e, f, h, k) {
'ok' === b ? (d && (b = c.auth, f.auth = b, f.expires = c.expires, f.token = bd(e) ? e : '', c = null, b && v(b, 'uid') ? c = w(b, 'uid') : v(f, 'uid') && (c = w(f, 'uid')), f.uid = c, c = 'custom', b && v(b, 'provider') ? c = w(b, 'provider') : v(f, 'provider') && (c = w(f, 'provider')), f.provider = c, a.sc.clear(), bd(e) && (h = h || {}, c = xc, 'sessionOnly' === h.remember && (c = yc), 'none' !== h.remember && a.sc.set(f, c)), Vg(a, f)), P(k, null, f)) : (a.sc.clear(), Vg(a, null), f = a = (b || 'error').toUpperCase(), c && (f += ': ' + c), f = Error(f), f.code = a, P(k, f));
}
function Xg(a, b, c, d, e) {
O(b + ' was canceled: ' + d);
a.sc.clear();
Vg(a, null);
a = Error(d);
a.code = c.toUpperCase();
P(e, a);
}
function $g(a, b, c, d, e) {
ah(a);
c = new tg(d || {}, {}, c || {});
bh(a, [
Og,
Qg
], '/auth/' + b, c, e);
}
function ch(a, b, c, d) {
ah(a);
var e = [
Ng,
Pg
];
c = vg(c);
'anonymous' === b || 'password' === b ? setTimeout(function () {
P(d, Mg('TRANSPORT_UNAVAILABLE'));
}, 0) : (c.ee.window_features = 'menubar=yes,modal=yes,alwaysRaised=yeslocation=yes,resizable=yes,scrollbars=yes,status=yes,height=625,width=625,top=' + ('object' === typeof screen ? 0.5 * (screen.height - 625) : 0) + ',left=' + ('object' === typeof screen ? 0.5 * (screen.width - 625) : 0), c.ee.relay_url = Hg(a.F.hc), c.ee.requestWithCredential = q(a.qc, a), bh(a, e, '/auth/' + b, c, d));
}
function Ug(a) {
var b = yc.get('redirect_request_id');
if (b) {
var c = yc.get('redirect_client_options');
yc.remove('redirect_request_id');
yc.remove('redirect_client_options');
var d = [
Og,
Qg
], b = {
requestId: b,
requestKey: Fg(document.location.hash)
}, c = new tg(c, {}, b);
a.Se = !0;
try {
document.location.hash = document.location.hash.replace(/&__firebase_request_key=([a-zA-z0-9]*)/, '');
} catch (e) {
}
bh(a, d, '/auth/session', c, function () {
this.Se = !1;
}.bind(a));
}
}
g.se = function (a, b) {
ah(this);
var c = vg(a);
c.$a._method = 'POST';
this.qc('/users', c, function (a, c) {
a ? P(b, a) : P(b, a, c);
});
};
g.Te = function (a, b) {
var c = this;
ah(this);
var d = '/users/' + encodeURIComponent(a.email), e = vg(a);
e.$a._method = 'DELETE';
this.qc(d, e, function (a, d) {
!a && d && d.uid && c.mb && c.mb.uid && c.mb.uid === d.uid && Zg(c);
P(b, a);
});
};
g.pe = function (a, b) {
ah(this);
var c = '/users/' + encodeURIComponent(a.email) + '/password', d = vg(a);
d.$a._method = 'PUT';
d.$a.password = a.newPassword;
this.qc(c, d, function (a) {
P(b, a);
});
};
g.oe = function (a, b) {
ah(this);
var c = '/users/' + encodeURIComponent(a.oldEmail) + '/email', d = vg(a);
d.$a._method = 'PUT';
d.$a.email = a.newEmail;
d.$a.password = a.password;
this.qc(c, d, function (a) {
P(b, a);
});
};
g.Ve = function (a, b) {
ah(this);
var c = '/users/' + encodeURIComponent(a.email) + '/password', d = vg(a);
d.$a._method = 'POST';
this.qc(c, d, function (a) {
P(b, a);
});
};
g.qc = function (a, b, c) {
dh(this, [
Og,
Qg
], a, b, c);
};
function bh(a, b, c, d, e) {
dh(a, b, c, d, function (b, c) {
!b && c && c.token && c.uid ? Yg(a, c.token, c, d.od, function (a, b) {
a ? P(e, a) : P(e, null, b);
}) : P(e, b || Mg('UNKNOWN_ERROR'));
});
}
function dh(a, b, c, d, e) {
b = Pa(b, function (a) {
return 'function' === typeof a.isAvailable && a.isAvailable();
});
0 === b.length ? setTimeout(function () {
P(e, Mg('TRANSPORT_UNAVAILABLE'));
}, 0) : (b = new (b.shift())(d.ee), d = jb(d.$a), d.v = 'js-' + hb, d.transport = b.Cc(), d.suppress_status_codes = !0, a = Gg() + '/' + a.F.hc + c, b.open(a, d, function (a, b) {
if (a)
P(e, a);
else if (b && b.error) {
var c = Error(b.error.message);
c.code = b.error.code;
c.details = b.error.details;
P(e, c);
} else
P(e, null, b);
}));
}
function Vg(a, b) {
var c = null !== a.mb || null !== b;
a.mb = b;
c && a.fe('auth_status', b);
a.Le(null !== b);
}
g.Ae = function (a) {
K('auth_status' === a, 'initial event must be of type "auth_status"');
return this.Se ? null : [this.mb];
};
function ah(a) {
var b = a.F;
if ('firebaseio.com' !== b.domain && 'firebaseio-demo.com' !== b.domain && 'auth.firebase.com' === sg)
throw Error('This custom Firebase server (\'' + a.F.domain + '\') does not support delegated login.');
}
;
var Cc = 'websocket', Dc = 'long_polling';
function eh(a) {
this.jc = a;
this.Nd = [];
this.Sb = 0;
this.qe = -1;
this.Fb = null;
}
function fh(a, b, c) {
a.qe = b;
a.Fb = c;
a.qe < a.Sb && (a.Fb(), a.Fb = null);
}
function gh(a, b, c) {
for (a.Nd[b] = c; a.Nd[a.Sb];) {
var d = a.Nd[a.Sb];
delete a.Nd[a.Sb];
for (var e = 0; e < d.length; ++e)
if (d[e]) {
var f = a;
Db(function () {
f.jc(d[e]);
});
}
if (a.Sb === a.qe) {
a.Fb && (clearTimeout(a.Fb), a.Fb(), a.Fb = null);
break;
}
a.Sb++;
}
}
;
function hh(a, b, c, d) {
this.re = a;
this.f = Mc(a);
this.nb = this.ob = 0;
this.Ua = Rb(b);
this.Qf = c;
this.Hc = !1;
this.Bb = d;
this.jd = function (a) {
return Bc(b, Dc, a);
};
}
var ih, jh;
hh.prototype.open = function (a, b) {
this.hf = 0;
this.la = b;
this.Af = new eh(a);
this.zb = !1;
var c = this;
this.qb = setTimeout(function () {
c.f('Timed out trying to connect.');
c.gb();
c.qb = null;
}, Math.floor(30000));
Rc(function () {
if (!c.zb) {
c.Sa = new kh(function (a, b, d, k, l) {
lh(c, arguments);
if (c.Sa)
if (c.qb && (clearTimeout(c.qb), c.qb = null), c.Hc = !0, 'start' == a)
c.id = b, c.Gf = d;
else if ('close' === a)
b ? (c.Sa.Xd = !1, fh(c.Af, b, function () {
c.gb();
})) : c.gb();
else
throw Error('Unrecognized command received: ' + a);
}, function (a, b) {
lh(c, arguments);
gh(c.Af, a, b);
}, function () {
c.gb();
}, c.jd);
var a = { start: 't' };
a.ser = Math.floor(100000000 * Math.random());
c.Sa.he && (a.cb = c.Sa.he);
a.v = '5';
c.Qf && (a.s = c.Qf);
c.Bb && (a.ls = c.Bb);
'undefined' !== typeof location && location.href && -1 !== location.href.indexOf('firebaseio.com') && (a.r = 'f');
a = c.jd(a);
c.f('Connecting via long-poll to ' + a);
mh(c.Sa, a, function () {
});
}
});
};
hh.prototype.start = function () {
var a = this.Sa, b = this.Gf;
a.ug = this.id;
a.vg = b;
for (a.le = !0; nh(a););
a = this.id;
b = this.Gf;
this.gc = document.createElement('iframe');
var c = { dframe: 't' };
c.id = a;
c.pw = b;
this.gc.src = this.jd(c);
this.gc.style.display = 'none';
document.body.appendChild(this.gc);
};
hh.isAvailable = function () {
return ih || !jh && 'undefined' !== typeof document && null != document.createElement && !('object' === typeof window && window.chrome && window.chrome.extension && !/^chrome/.test(window.location.href)) && !('object' === typeof Windows && 'object' === typeof Windows.Xg) && !0;
};
g = hh.prototype;
g.Ed = function () {
};
g.dd = function () {
this.zb = !0;
this.Sa && (this.Sa.close(), this.Sa = null);
this.gc && (document.body.removeChild(this.gc), this.gc = null);
this.qb && (clearTimeout(this.qb), this.qb = null);
};
g.gb = function () {
this.zb || (this.f('Longpoll is closing itself'), this.dd(), this.la && (this.la(this.Hc), this.la = null));
};
g.close = function () {
this.zb || (this.f('Longpoll is being closed.'), this.dd());
};
g.send = function (a) {
a = B(a);
this.ob += a.length;
Ob(this.Ua, 'bytes_sent', a.length);
a = Ic(a);
a = fb(a, !0);
a = Vc(a, 1840);
for (var b = 0; b < a.length; b++) {
var c = this.Sa;
c.ad.push({
Mg: this.hf,
Ug: a.length,
kf: a[b]
});
c.le && nh(c);
this.hf++;
}
};
function lh(a, b) {
var c = B(b).length;
a.nb += c;
Ob(a.Ua, 'bytes_received', c);
}
function kh(a, b, c, d) {
this.jd = d;
this.hb = c;
this.Pe = new pg();
this.ad = [];
this.te = Math.floor(100000000 * Math.random());
this.Xd = !0;
this.he = Ec();
window['pLPCommand' + this.he] = a;
window['pRTLPCB' + this.he] = b;
a = document.createElement('iframe');
a.style.display = 'none';
if (document.body) {
document.body.appendChild(a);
try {
a.contentWindow.document || Cb('No IE domain setting required');
} catch (e) {
a.src = 'javascript:void((function(){document.open();document.domain=\'' + document.domain + '\';document.close();})())';
}
} else
throw 'Document body has not initialized. Wait to initialize Firebase until after the document is ready.';
a.contentDocument ? a.eb = a.contentDocument : a.contentWindow ? a.eb = a.contentWindow.document : a.document && (a.eb = a.document);
this.Ea = a;
a = '';
this.Ea.src && 'javascript:' === this.Ea.src.substr(0, 11) && (a = '<script>document.domain="' + document.domain + '";
Polymer.FirebaseQueryBehavior = {
properties: {
location: {
type: String,
notify: true,
reflectToAttribute: true
},
query: {
type: Object,
notify: true,
readOnly: true
},
log: {
type: Boolean,
value: false,
reflectToAttribute: true
},
_receivingRemoteChanges: {
type: Boolean,
value: false
}
},
observers: ['_dataChanged(data.*)'],
get dataAsObject() {
if (Array.isArray(this.data)) {
return this.data.reduce(function (object, value, index) {
object[index] = value;
}, {});
}
return this.data;
},
disconnect: function () {
this.location = '';
},
_applyLocalDataChanges: function (changes) {
},
_applyRemoteDataChange: function (applyChange) {
if (this._applyingLocalDataChanges) {
return;
}
this._receivingRemoteChanges = true;
applyChange.call(this);
this._receivingRemoteChanges = false;
},
_dataChanged: function (changes) {
if (this._receivingRemoteChanges) {
return;
}
this._applyingLocalDataChanges = true;
this._applyLocalDataChanges(changes);
this._applyingLocalDataChanges = false;
},
_queryChanged: function (query, oldQuery) {
if (oldQuery) {
this._stopListeningToQuery(oldQuery);
}
if (query) {
this._listenToQuery(query);
}
},
_listenToQuery: function (query) {
this._log('Adding Firebase event handlers.');
query.on('value', this._onQueryValue, this._onQueryCancel, this);
query.on('child_added', this._onQueryChildAdded, this._onQueryCancel, this);
query.on('child_removed', this._onQueryChildRemoved, this._onQueryCancel, this);
query.on('child_changed', this._onQueryChildChanged, this._onQueryCancel, this);
query.on('child_moved', this._onQueryChildMoved, this._onQueryCancel, this);
},
_stopListeningToQuery: function (query) {
this._log('Removing Firebase event handlers');
query.off('value', this._onQueryValue, this);
query.off('child_added', this._onQueryChildAdded, this);
query.off('child_removed', this._onQueryChildRemoved, this);
query.off('child_changed', this._onQueryChildChanged, this);
query.off('child_moved', this._onQueryChildMoved, this);
},
_onQueryValue: function (snapshot) {
this._log('Firebase Event: "value"', snapshot);
this.fire('firebase-value', snapshot, { bubbles: false });
},
_onQueryChildAdded: function (childSnapshot, previousChildName) {
this._log('Firebase Event: "child_added"', childSnapshot, previousChildName);
this.fire('firebase-child-added', {
childSnapshot: childSnapshot,
previousChildName: previousChildName
}, { bubbles: false });
},
_onQueryChildRemoved: function (oldChildSnapshot) {
this._log('Firebase Event: "child_removed"', oldChildSnapshot);
this.fire('firebase-child-removed', { oldChildSnapshot: oldChildSnapshot }, { bubbles: false });
},
_onQueryChildChanged: function (childSnapshot, previousChildName) {
this._log('Firebase Event: "child_changed"', childSnapshot, previousChildName);
this.fire('firebase-child-changed', {
childSnapshot: childSnapshot,
previousChildName: previousChildName
}, { bubbles: false });
},
_onQueryChildMoved: function (childSnapshot, previousChildName) {
this._log('Firebase Event: "child_moved"', childSnapshot, previousChildName);
this.fire('firebase-child-moved', {
childSnapshot: childSnapshot,
previousChildName: previousChildName
}, { bubbles: false });
},
_onQueryCancel: function (error) {
if (error) {
this._error('Firebase Error', error);
}
this._log('Firebase query subscription cancelled.');
this.disconnect();
},
_log: function () {
var args;
if (this.log) {
args = Array.prototype.slice.call(arguments).map(function (arg) {
if (arg && typeof arg.val === 'function') {
return arg.val();
}
return arg;
});
console.log.apply(console, args);
}
},
_error: function () {
if (this.log) {
console.error.apply(console, arguments);
}
}
};
(function () {
'use strict';
var FirebaseCollection = Polymer({
is: 'firebase-collection',
behaviors: [Polymer.FirebaseQueryBehavior],
properties: {
query: {
type: Object,
notify: true,
computed: '_computeQuery(location, limitToFirst, limitToLast, _orderByMethodName, _startAt, _endAt, _equalTo)',
observer: '_queryChanged'
},
data: {
type: Array,
readOnly: true,
notify: true,
value: function () {
return [];
}
},
orderByChild: {
type: String,
value: null,
reflectToAttribute: true
},
orderByKey: {
type: Boolean,
value: false,
reflectToAttribute: true
},
orderByValue: {
type: Boolean,
value: false,
reflectToAttribute: true
},
orderByPriority: {
type: Boolean,
value: false,
reflectToAttribute: true
},
limitToFirst: {
type: Number,
value: null,
reflectToAttribute: true
},
limitToLast: {
type: Number,
value: null,
reflectToAttribute: true
},
startAt: {
type: String,
value: null,
reflectToAttribute: true
},
endAt: {
type: String,
value: null,
reflectToAttribute: true
},
equalTo: {
type: String,
value: null,
reflectToAttribute: true
},
orderValueType: {
type: String,
value: 'string',
reflectToAttribute: true
},
_valueMap: {
type: Object,
value: function () {
return {};
}
},
_orderByMethodName: { computed: '_computeOrderByMethodName(orderByChild, orderByKey, orderByValue, orderByPriority)' },
_orderByTypeCast: { computed: '_computeOrderByTypeCast(orderByChild, orderByKey, orderByValue, orderByPriority, orderValueType)' },
_startAt: { computed: '_computeStartAt(startAt, _orderByTypeCast)' },
_endAt: { computed: '_computeEndAt(endAt, _orderByTypeCast)' },
_equalTo: { computed: '_computeEqualTo(equalTo, _orderByTypeCast)' }
},
listeners: {
'firebase-child-added': '_onFirebaseChildAdded',
'firebase-child-removed': '_onFirebaseChildRemoved',
'firebase-child-changed': '_onFirebaseChildChanged',
'firebase-child-moved': '_onFirebaseChildMoved'
},
add: function (data) {
var query;
this._log('Adding new item to collection with value:', data);
query = this.query.ref().push();
query.set(data);
if (typeof data == 'object') {
data.__firebaseKey__ = query.key();
}
return query;
},
remove: function (data) {
if (data == null || data.__firebaseKey__ == null) {
this._error('Failed to remove unknown value:', data);
return;
}
this._log('Removing collection item "' + data.__firebaseKey__ + '"', data.value);
this.removeByKey(data.__firebaseKey__);
},
getByKey: function (key) {
return this._valueMap[key];
},
removeByKey: function (key) {
this.query.ref().child(key).remove();
},
_applyLocalDataChanges: function (change) {
var pathParts = change.path.split('.');
var firebaseKey;
var key;
var value;
if (pathParts.length < 2 || pathParts[1] === 'length') {
return;
}
if (pathParts[1] === 'splices') {
this._applySplicesToRemoteData(change.value.indexSplices);
return;
}
key = pathParts[1];
value = Polymer.Collection.get(change.base).getItem(key);
firebaseKey = value.__firebaseKey__;
value.__firebaseKey__ = null;
this.query.ref().child(firebaseKey).set(value);
value.__firebaseKey__ = firebaseKey;
},
_applySplicesToRemoteData: function (splices) {
this._log('splices', splices);
splices.forEach(function (splice) {
var added = splice.object.slice(splice.index, splice.index + splice.addedCount);
splice.removed.forEach(function (removed) {
this.remove(removed);
}, this);
added.forEach(function (added) {
this.add(added);
}, this);
}, this);
},
_computeQuery: function (location, limitToFirst, limitToLast, orderByMethodName, startAt, endAt, equalTo) {
var query;
if (!location) {
return;
}
query = new Firebase(location);
if (orderByMethodName) {
if (orderByMethodName === 'orderByChild') {
query = query[orderByMethodName](this.orderByChild);
} else {
query = query[orderByMethodName]();
}
}
if (startAt != null) {
query = query.startAt(startAt);
}
if (endAt != null) {
query = query.endAt(endAt);
}
if (equalTo != null) {
query = query.equalTo(equalTo);
}
if (limitToLast != null) {
query = query.limitToLast(limitToLast);
}
if (limitToFirst != null) {
query = query.limitToFirst(limitToFirst);
}
return query;
},
_queryChanged: function () {
this._valueMap = {};
this._setData([]);
Polymer.FirebaseQueryBehavior._queryChanged.apply(this, arguments);
},
_computeOrderByMethodName: function (orderByChild, orderByKey, orderByValue, orderByPriority) {
if (orderByChild) {
return 'orderByChild';
}
if (orderByKey) {
return 'orderByKey';
}
if (orderByValue) {
return 'orderByValue';
}
if (orderByPriority) {
return 'orderByPriority';
}
return null;
},
_computeOrderByTypeCast: function (orderByChild, orderByKey, orderByValue, orderByPriority, orderValueType) {
return function typeCast(value) {
if (!orderByKey && value != null && FirebaseCollection.ORDER_VALUE_TYPES[orderValueType]) {
return FirebaseCollection.ORDER_VALUE_TYPES[orderValueType](value);
}
return value;
};
},
_computeStartAt: function (startAt, orderByTypeCast) {
return orderByTypeCast(startAt);
},
_computeEndAt: function (endAt, orderByTypeCast) {
return orderByTypeCast(endAt);
},
_computeEqualTo: function (equalTo, orderByTypeCast) {
return orderByTypeCast(equalTo);
},
_valueFromSnapshot: function (snapshot) {
var value = snapshot.val();
if (!(value instanceof Object)) {
value = {
value: value,
__firebasePrimitive__: true
};
}
value.__firebaseKey__ = snapshot.key();
return value;
},
_valueToPersistable: function (value) {
var persistable;
if (value.__firebasePrimitive__) {
return value.value;
}
persistable = {};
for (var property in value) {
if (property === '__firebaseKey__') {
continue;
}
persistable[property] = value[property];
}
return persistable;
},
_onFirebaseChildAdded: function (event) {
this._applyRemoteDataChange(function () {
var value = this._valueFromSnapshot(event.detail.childSnapshot);
var previousValueKey = event.detail.previousChildName;
var index = previousValueKey != null ? this.data.indexOf(this._valueMap[previousValueKey]) + 1 : 0;
this._valueMap[value.__firebaseKey__] = value;
this.splice('data', index, 0, value);
});
},
_onFirebaseChildRemoved: function (event) {
this._applyRemoteDataChange(function () {
var key = event.detail.oldChildSnapshot.key();
var value = this._valueMap[key];
var index;
if (!value) {
this._error('Received firebase-child-removed event for unknown child "' + key + '"');
return;
}
index = this.data.indexOf(value);
this._valueMap[key] = null;
if (index !== -1) {
this.splice('data', index, 1);
}
});
},
_onFirebaseChildChanged: function (event) {
this._applyRemoteDataChange(function () {
var value = this._valueFromSnapshot(event.detail.childSnapshot);
var oldValue = this._valueMap[value.__firebaseKey__];
if (!oldValue) {
this._error('Received firebase-child-changed event for unknown child "' + value.__firebaseKey__ + '"');
return;
}
this._valueMap[oldValue.__firebaseKey__] = null;
this._valueMap[value.__firebaseKey__] = value;
this.splice('data', this.data.indexOf(oldValue), 1, value);
});
},
_onFirebaseChildMoved: function (event) {
this._applyRemoteDataChange(function () {
var key = event.detail.childSnapshot.key();
var value = this._valueMap[key];
var previousChild;
var newIndex;
var currentIndex;
var previousIndex;
if (!value) {
this._error('Received firebase-child-moved event for unknown child "' + key + '"');
return;
}
previousChild = event.detail.previousChildName != null ? this._valueMap[event.detail.previousChildName] : null;
currentIndex = this.data.indexOf(value);
previousIndex = previousChild ? this.data.indexOf(previousChild) : -1;
newIndex = currentIndex > previousIndex ? previousIndex + 1 : previousIndex;
this.splice('data', currentIndex, 1);
this.splice('data', newIndex, 0, value);
});
}
});
FirebaseCollection.ORDER_VALUE_TYPES = {
string: String,
number: Number,
boolean: Boolean
};
}());
(function (a) {
function k(a, b, c, d) {
var e = 0, f = 0, g = 0, c = (c || '(').toString(), d = (d || ')').toString(), h;
for (h = 0; h < a.length; h++) {
var i = a[h];
if (i.indexOf(c, e) > i.indexOf(d, e) || ~i.indexOf(c, e) && !~i.indexOf(d, e) || !~i.indexOf(c, e) && ~i.indexOf(d, e)) {
f = i.indexOf(c, e), g = i.indexOf(d, e);
if (~f && !~g || !~f && ~g) {
var j = a.slice(0, (h || 1) + 1).join(b);
a = [j].concat(a.slice((h || 1) + 1));
}
e = (g > f ? g : f) + 1, h = 0;
} else
e = 0;
}
return a;
}
function j(a, b) {
var c, d = 0, e = '';
while (c = a.substr(d).match(/[^\w\d\- %@&]*\*[^\w\d\- %@&]*/))
d = c.index + c[0].length, c[0] = c[0].replace(/^\*/, '([_.()!\\ %@&a-zA-Z0-9-]+)'), e += a.substr(0, c.index) + c[0];
a = e += a.substr(d);
var f = a.match(/:([^\/]+)/gi), g, h;
if (f) {
h = f.length;
for (var j = 0; j < h; j++)
g = f[j], g.slice(0, 2) === '::' ? a = g.slice(1) : a = a.replace(g, i(g, b));
}
return a;
}
function i(a, b, c) {
c = a;
for (var d in b)
if (b.hasOwnProperty(d)) {
c = b[d](a);
if (c !== a)
break;
}
return c === a ? '([._a-zA-Z0-9-%()]+)' : c;
}
function h(a, b, c) {
if (!a.length)
return c();
var d = 0;
(function e() {
b(a[d], function (b) {
b || b === !1 ? (c(b), c = function () {
}) : (d += 1, d === a.length ? c() : e());
});
}());
}
function g(a) {
var b = [];
for (var c = 0, d = a.length; c < d; c++)
b = b.concat(a[c]);
return b;
}
function f(a, b) {
for (var c = 0; c < a.length; c += 1)
if (b(a[c], c, a) === !1)
return;
}
function c() {
return b.hash === '' || b.hash === '#';
}
var b = document.location, d = {
mode: 'modern',
hash: b.hash,
history: !1,
check: function () {
var a = b.hash;
a != this.hash && (this.hash = a, this.onHashChanged());
},
fire: function () {
this.mode === 'modern' ? this.history === !0 ? window.onpopstate() : window.onhashchange() : this.onHashChanged();
},
init: function (a, b) {
function d(a) {
for (var b = 0, c = e.listeners.length; b < c; b++)
e.listeners[b](a);
}
var c = this;
this.history = b, e.listeners || (e.listeners = []);
if ('onhashchange' in window && (document.documentMode === undefined || document.documentMode > 7))
this.history === !0 ? setTimeout(function () {
window.onpopstate = d;
}, 500) : window.onhashchange = d, this.mode = 'modern';
else {
var f = document.createElement('iframe');
f.id = 'state-frame', f.style.display = 'none', document.body.appendChild(f), this.writeFrame(''), 'onpropertychange' in document && 'attachEvent' in document && document.attachEvent('onpropertychange', function () {
event.propertyName === 'location' && c.check();
}), window.setInterval(function () {
c.check();
}, 50), this.onHashChanged = d, this.mode = 'legacy';
}
e.listeners.push(a);
return this.mode;
},
destroy: function (a) {
if (!!e && !!e.listeners) {
var b = e.listeners;
for (var c = b.length - 1; c >= 0; c--)
b[c] === a && b.splice(c, 1);
}
},
setHash: function (a) {
this.mode === 'legacy' && this.writeFrame(a), this.history === !0 ? (window.history.pushState({}, document.title, a), this.fire()) : b.hash = a[0] === '/' ? a : '/' + a;
return this;
},
writeFrame: function (a) {
var b = document.getElementById('state-frame'), c = b.contentDocument || b.contentWindow.document;
c.open(), c.write('<script>_hash = \'' + a + '\'; onload = parent.listener.syncHash;<script>'), c.close();
},
syncHash: function () {
var a = this._hash;
a != b.hash && (b.hash = a);
return this;
},
onHashChanged: function () {
}
}, e = a.Router = function (a) {
if (this instanceof e)
this.params = {}, this.routes = {}, this.methods = [
'on',
'once',
'after',
'before'
], this.scope = [], this._methods = {}, this._insert = this.insert, this.insert = this.insertEx, this.historySupport = (window.history != null ? window.history.pushState : null) != null, this.configure(), this.mount(a || {});
else
return new e(a);
};
e.prototype.init = function (a) {
var e = this, f;
this.handler = function (a) {
var b = a && a.newURL || window.location.hash, c = e.history === !0 ? e.getPath() : b.replace(/.*#/, '');
e.dispatch('on', c.charAt(0) === '/' ? c : '/' + c);
}, d.init(this.handler, this.history), this.history === !1 ? c() && a ? b.hash = a : c() || e.dispatch('on', '/' + b.hash.replace(/^(#\/|#|\/)/, '')) : (this.convert_hash_in_init ? (f = c() && a ? a : c() ? null : b.hash.replace(/^#/, ''), f && window.history.replaceState({}, document.title, f)) : f = this.getPath(), (f || this.run_in_init === !0) && this.handler());
return this;
}, e.prototype.explode = function () {
var a = this.history === !0 ? this.getPath() : b.hash;
a.charAt(1) === '/' && (a = a.slice(1));
return a.slice(1, a.length).split('/');
}, e.prototype.setRoute = function (a, b, c) {
var e = this.explode();
typeof a == 'number' && typeof b == 'string' ? e[a] = b : typeof c == 'string' ? e.splice(a, b, s) : e = [a], d.setHash(e.join('/'));
return e;
}, e.prototype.insertEx = function (a, b, c, d) {
a === 'once' && (a = 'on', c = function (a) {
var b = !1;
return function () {
if (!b) {
b = !0;
return a.apply(this, arguments);
}
};
}(c));
return this._insert(a, b, c, d);
}, e.prototype.getRoute = function (a) {
var b = a;
if (typeof a == 'number')
b = this.explode()[a];
else if (typeof a == 'string') {
var c = this.explode();
b = c.indexOf(a);
} else
b = this.explode();
return b;
}, e.prototype.destroy = function () {
d.destroy(this.handler);
return this;
}, e.prototype.getPath = function () {
var a = window.location.pathname;
a.substr(0, 1) !== '/' && (a = '/' + a);
return a;
};
var l = /\?.*/;
e.prototype.configure = function (a) {
a = a || {};
for (var b = 0; b < this.methods.length; b++)
this._methods[this.methods[b]] = !0;
this.recurse = a.recurse || this.recurse || !1, this.async = a.async || !1, this.delimiter = a.delimiter || '/', this.strict = typeof a.strict == 'undefined' ? !0 : a.strict, this.notfound = a.notfound, this.resource = a.resource, this.history = a.html5history && this.historySupport || !1, this.run_in_init = this.history === !0 && a.run_handler_in_init !== !1, this.convert_hash_in_init = this.history === !0 && a.convert_hash_in_init !== !1, this.every = {
after: a.after || null,
before: a.before || null,
on: a.on || null
};
return this;
}, e.prototype.param = function (a, b) {
a[0] !== ':' && (a = ':' + a);
var c = new RegExp(a, 'g');
this.params[a] = function (a) {
return a.replace(c, b.source || b);
};
return this;
}, e.prototype.on = e.prototype.route = function (a, b, c) {
var d = this;
!c && typeof b == 'function' && (c = b, b = a, a = 'on');
if (Array.isArray(b))
return b.forEach(function (b) {
d.on(a, b, c);
});
b.source && (b = b.source.replace(/\\\//gi, '/'));
if (Array.isArray(a))
return a.forEach(function (a) {
d.on(a.toLowerCase(), b, c);
});
b = b.split(new RegExp(this.delimiter)), b = k(b, this.delimiter), this.insert(a, this.scope.concat(b), c);
}, e.prototype.path = function (a, b) {
var c = this, d = this.scope.length;
a.source && (a = a.source.replace(/\\\//gi, '/')), a = a.split(new RegExp(this.delimiter)), a = k(a, this.delimiter), this.scope = this.scope.concat(a), b.call(this, this), this.scope.splice(d, a.length);
}, e.prototype.dispatch = function (a, b, c) {
function h() {
d.last = e.after, d.invoke(d.runlist(e), d, c);
}
var d = this, e = this.traverse(a, b.replace(l, ''), this.routes, ''), f = this._invoked, g;
this._invoked = !0;
if (!e || e.length === 0) {
this.last = [], typeof this.notfound == 'function' && this.invoke([this.notfound], {
method: a,
path: b
}, c);
return !1;
}
this.recurse === 'forward' && (e = e.reverse()), g = this.every && this.every.after ? [this.every.after].concat(this.last) : [this.last];
if (g && g.length > 0 && f) {
this.async ? this.invoke(g, this, h) : (this.invoke(g, this), h());
return !0;
}
h();
return !0;
}, e.prototype.invoke = function (a, b, c) {
var d = this, e;
this.async ? (e = function (c, d) {
if (Array.isArray(c))
return h(c, e, d);
typeof c == 'function' && c.apply(b, (a.captures || []).concat(d));
}, h(a, e, function () {
c && c.apply(b, arguments);
})) : (e = function (c) {
if (Array.isArray(c))
return f(c, e);
if (typeof c == 'function')
return c.apply(b, a.captures || []);
typeof c == 'string' && d.resource && d.resource[c].apply(b, a.captures || []);
}, f(a, e));
}, e.prototype.traverse = function (a, b, c, d, e) {
function l(a) {
function c(a) {
for (var b = a.length - 1; b >= 0; b--)
Array.isArray(a[b]) ? (c(a[b]), a[b].length === 0 && a.splice(b, 1)) : e(a[b]) || a.splice(b, 1);
}
function b(a) {
var c = [];
for (var d = 0; d < a.length; d++)
c[d] = Array.isArray(a[d]) ? b(a[d]) : a[d];
return c;
}
if (!e)
return a;
var d = b(a);
d.matched = a.matched, d.captures = a.captures, d.after = a.after.filter(e), c(d);
return d;
}
var f = [], g, h, i, j, k;
if (b === this.delimiter && c[a]) {
j = [[
c.before,
c[a]
].filter(Boolean)], j.after = [c.after].filter(Boolean), j.matched = !0, j.captures = [];
return l(j);
}
for (var m in c)
if (c.hasOwnProperty(m) && (!this._methods[m] || this._methods[m] && typeof c[m] == 'object' && !Array.isArray(c[m]))) {
g = h = d + this.delimiter + m, this.strict || (h += '[' + this.delimiter + ']?'), i = b.match(new RegExp('^' + h));
if (!i)
continue;
if (i[0] && i[0] == b && c[m][a]) {
j = [[
c[m].before,
c[m][a]
].filter(Boolean)], j.after = [c[m].after].filter(Boolean), j.matched = !0, j.captures = i.slice(1), this.recurse && c === this.routes && (j.push([
c.before,
c.on
].filter(Boolean)), j.after = j.after.concat([c.after].filter(Boolean)));
return l(j);
}
j = this.traverse(a, b, c[m], g);
if (j.matched) {
j.length > 0 && (f = f.concat(j)), this.recurse && (f.push([
c[m].before,
c[m].on
].filter(Boolean)), j.after = j.after.concat([c[m].after].filter(Boolean)), c === this.routes && (f.push([
c.before,
c.on
].filter(Boolean)), j.after = j.after.concat([c.after].filter(Boolean)))), f.matched = !0, f.captures = j.captures, f.after = j.after;
return l(f);
}
}
return !1;
}, e.prototype.insert = function (a, b, c, d) {
var e, f, g, h, i;
b = b.filter(function (a) {
return a && a.length > 0;
}), d = d || this.routes, i = b.shift(), /\:|\*/.test(i) && !/\\d|\\w/.test(i) && (i = j(i, this.params));
if (b.length > 0) {
d[i] = d[i] || {};
return this.insert(a, b, c, d[i]);
}
{
if (!!i || !!b.length || d !== this.routes) {
f = typeof d[i], g = Array.isArray(d[i]);
if (d[i] && !g && f == 'object') {
e = typeof d[i][a];
switch (e) {
case 'function':
d[i][a] = [
d[i][a],
c
];
return;
case 'object':
d[i][a].push(c);
return;
case 'undefined':
d[i][a] = c;
return;
}
} else if (f == 'undefined') {
h = {}, h[a] = c, d[i] = h;
return;
}
throw new Error('Invalid route context: ' + f);
}
e = typeof d[a];
switch (e) {
case 'function':
d[a] = [
d[a],
c
];
return;
case 'object':
d[a].push(c);
return;
case 'undefined':
d[a] = c;
return;
}
}
}, e.prototype.extend = function (a) {
function e(a) {
b._methods[a] = !0, b[a] = function () {
var c = arguments.length === 1 ? [
a,
''
] : [a];
b.on.apply(b, c.concat(Array.prototype.slice.call(arguments)));
};
}
var b = this, c = a.length, d;
for (d = 0; d < c; d++)
e(a[d]);
}, e.prototype.runlist = function (a) {
var b = this.every && this.every.before ? [this.every.before].concat(g(a)) : g(a);
this.every && this.every.on && b.push(this.every.on), b.captures = a.captures, b.source = a.source;
return b;
}, e.prototype.mount = function (a, b) {
function d(b, d) {
var e = b, f = b.split(c.delimiter), g = typeof a[b], h = f[0] === '' || !c._methods[f[0]], i = h ? 'on' : e;
h && (e = e.slice((e.match(new RegExp('^' + c.delimiter)) || [''])[0].length), f.shift());
h && g === 'object' && !Array.isArray(a[b]) ? (d = d.concat(f), c.mount(a[b], d)) : (h && (d = d.concat(e.split(c.delimiter)), d = k(d, c.delimiter)), c.insert(i, d, a[b]));
}
if (!!a && typeof a == 'object' && !Array.isArray(a)) {
var c = this;
b = b || [], Array.isArray(b) || (b = b.split(c.delimiter));
for (var e in a)
a.hasOwnProperty(e) && d(e, b.slice(0));
}
};
}(typeof exports == 'object' ? exports : window));
Polymer({
is: 'flatiron-director',
properties: {
autoHash: {
type: Boolean,
value: false
},
route: {
type: String,
value: '',
notify: true
}
},
observers: ['_routeChanged(route)'],
_routingIsReady: false,
ready: function () {
this._router.on(/(.*)/, function (route) {
this.route = route;
}.bind(this));
this.route = this._router.getRoute() ? this._router.getRoute().join(this._router.delimiter) : '';
this._routingIsReady = true;
},
_routeChanged: function () {
if (this.autoHash && this._routingIsReady) {
window.location.hash = this.route ? this.route : '';
}
this.fire('director-route', this.route);
},
get _router() {
if (!window.FlatironDirectorPolymer) {
window.FlatironDirectorPolymer = new Router();
window.FlatironDirectorPolymer.init();
}
return window.FlatironDirectorPolymer;
}
});
Polymer.IronSelection = function (selectCallback) {
this.selection = [];
this.selectCallback = selectCallback;
};
Polymer.IronSelection.prototype = {
get: function () {
return this.multi ? this.selection.slice() : this.selection[0];
},
clear: function (excludes) {
this.selection.slice().forEach(function (item) {
if (!excludes || excludes.indexOf(item) < 0) {
this.setItemSelected(item, false);
}
}, this);
},
isSelected: function (item) {
return this.selection.indexOf(item) >= 0;
},
setItemSelected: function (item, isSelected) {
if (item != null) {
if (isSelected) {
this.selection.push(item);
} else {
var i = this.selection.indexOf(item);
if (i >= 0) {
this.selection.splice(i, 1);
}
}
if (this.selectCallback) {
this.selectCallback(item, isSelected);
}
}
},
select: function (item) {
if (this.multi) {
this.toggle(item);
} else if (this.get() !== item) {
this.setItemSelected(this.get(), false);
this.setItemSelected(item, true);
}
},
toggle: function (item) {
this.setItemSelected(item, !this.isSelected(item));
}
};
Polymer.IronSelectableBehavior = {
properties: {
attrForSelected: {
type: String,
value: null
},
selected: {
type: String,
notify: true
},
selectedItem: {
type: Object,
readOnly: true,
notify: true
},
activateEvent: {
type: String,
value: 'tap',
observer: '_activateEventChanged'
},
selectable: String,
selectedClass: {
type: String,
value: 'iron-selected'
},
selectedAttribute: {
type: String,
value: null
},
_excludedLocalNames: {
type: Object,
value: function () {
return { 'template': 1 };
}
}
},
observers: ['_updateSelected(attrForSelected, selected)'],
created: function () {
this._bindFilterItem = this._filterItem.bind(this);
this._selection = new Polymer.IronSelection(this._applySelection.bind(this));
this.__listeningForActivate = false;
},
attached: function () {
this._observer = this._observeItems(this);
this._contentObserver = this._observeContent(this);
if (!this.selectedItem && this.selected) {
this._updateSelected(this.attrForSelected, this.selected);
}
this._addListener(this.activateEvent);
},
detached: function () {
if (this._observer) {
this._observer.disconnect();
}
if (this._contentObserver) {
this._contentObserver.disconnect();
}
this._removeListener(this.activateEvent);
},
get items() {
var nodes = Polymer.dom(this).queryDistributedElements(this.selectable || '*');
return Array.prototype.filter.call(nodes, this._bindFilterItem);
},
indexOf: function (item) {
return this.items.indexOf(item);
},
select: function (value) {
this.selected = value;
},
selectPrevious: function () {
var length = this.items.length;
var index = (Number(this._valueToIndex(this.selected)) - 1 + length) % length;
this.selected = this._indexToValue(index);
},
selectNext: function () {
var index = (Number(this._valueToIndex(this.selected)) + 1) % this.items.length;
this.selected = this._indexToValue(index);
},
_addListener: function (eventName) {
if (!this.isAttached || this.__listeningForActivate) {
return;
}
this.__listeningForActivate = true;
this.listen(this, eventName, '_activateHandler');
},
_removeListener: function (eventName) {
this.unlisten(this, eventName, '_activateHandler');
this.__listeningForActivate = false;
},
_activateEventChanged: function (eventName, old) {
this._removeListener(old);
this._addListener(eventName);
},
_updateSelected: function () {
this._selectSelected(this.selected);
},
_selectSelected: function (selected) {
this._selection.select(this._valueToItem(this.selected));
},
_filterItem: function (node) {
return !this._excludedLocalNames[node.localName];
},
_valueToItem: function (value) {
return value == null ? null : this.items[this._valueToIndex(value)];
},
_valueToIndex: function (value) {
if (this.attrForSelected) {
for (var i = 0, item; item = this.items[i]; i++) {
if (this._valueForItem(item) == value) {
return i;
}
}
} else {
return Number(value);
}
},
_indexToValue: function (index) {
if (this.attrForSelected) {
var item = this.items[index];
if (item) {
return this._valueForItem(item);
}
} else {
return index;
}
},
_valueForItem: function (item) {
return item[this.attrForSelected] || item.getAttribute(this.attrForSelected);
},
_applySelection: function (item, isSelected) {
if (this.selectedClass) {
this.toggleClass(this.selectedClass, isSelected, item);
}
if (this.selectedAttribute) {
this.toggleAttribute(this.selectedAttribute, isSelected, item);
}
this._selectionChange();
this.fire('iron-' + (isSelected ? 'select' : 'deselect'), { item: item });
},
_selectionChange: function () {
this._setSelectedItem(this._selection.get());
},
_observeContent: function (node) {
var content = node.querySelector('content');
if (content && content.parentElement === node) {
return this._observeItems(node.domHost);
}
},
_observeItems: function (node) {
var observer = new MutationObserver(function (mutations) {
this.fire('iron-items-changed', mutations, {
bubbles: false,
cancelable: false
});
if (this.selected != null) {
this._updateSelected();
}
}.bind(this));
observer.observe(node, {
childList: true,
subtree: true
});
return observer;
},
_activateHandler: function (e) {
var t = e.target;
var items = this.items;
while (t && t != this) {
var i = items.indexOf(t);
if (i >= 0) {
var value = this._indexToValue(i);
this._itemActivate(value, t);
return;
}
t = t.parentNode;
}
},
_itemActivate: function (value, item) {
if (!this.fire('iron-activate', {
selected: value,
item: item
}, { cancelable: true }).defaultPrevented) {
this.select(value);
}
}
};
Polymer.IronMultiSelectableBehaviorImpl = {
properties: {
multi: {
type: Boolean,
value: false,
observer: 'multiChanged'
},
selectedValues: {
type: Array,
notify: true
},
selectedItems: {
type: Array,
readOnly: true,
notify: true
}
},
observers: ['_updateSelected(attrForSelected, selectedValues)'],
select: function (value) {
if (this.multi) {
if (this.selectedValues) {
this._toggleSelected(value);
} else {
this.selectedValues = [value];
}
} else {
this.selected = value;
}
},
multiChanged: function (multi) {
this._selection.multi = multi;
},
_updateSelected: function () {
if (this.multi) {
this._selectMulti(this.selectedValues);
} else {
this._selectSelected(this.selected);
}
},
_selectMulti: function (values) {
this._selection.clear();
if (values) {
for (var i = 0; i < values.length; i++) {
this._selection.setItemSelected(this._valueToItem(values[i]), true);
}
}
},
_selectionChange: function () {
var s = this._selection.get();
if (this.multi) {
this._setSelectedItems(s);
} else {
this._setSelectedItems([s]);
this._setSelectedItem(s);
}
},
_toggleSelected: function (value) {
var i = this.selectedValues.indexOf(value);
var unselected = i < 0;
if (unselected) {
this.push('selectedValues', value);
} else {
this.splice('selectedValues', i, 1);
}
this._selection.setItemSelected(this._valueToItem(value), unselected);
}
};
Polymer.IronMultiSelectableBehavior = [
Polymer.IronSelectableBehavior,
Polymer.IronMultiSelectableBehaviorImpl
];
Polymer({
is: 'iron-selector',
behaviors: [Polymer.IronMultiSelectableBehavior]
});
(function () {
'use strict';
var ENTER_KEY = 13;
var ESC_KEY = 27;
Polymer({
is: 'td-input',
extends: 'input',
listeners: {
'keyup': '_keyupAction',
'keypress': '_keypressAction'
},
_keypressAction: function (e, detail, sender) {
if (e.keyCode === ENTER_KEY) {
this.fire('td-input-commit');
}
},
_keyupAction: function (e, detail, sender) {
if (e.keyCode === ESC_KEY) {
this.fire('td-input-cancel');
}
}
});
}());
(function () {
'use strict';
Polymer({
is: 'td-model',
hostAttributes: { hidden: true },
properties: {
items: {
type: Array,
notify: true
},
filter: { type: String }
},
_initializeDefaultTodos: function () {
this.items = [];
},
newItem: function (label) {
label = String(label).trim();
if (!label) {
return;
}
this.push('items', {
__firebaseKey__: null,
label: label,
isCompleted: false
});
},
getCompletedCount: function () {
return this.items ? this.items.filter(this.filters.completed).length : 0;
},
getActiveCount: function () {
return this.items.length - this.getCompletedCount(this.items);
},
matchesFilter: function (item, filter) {
var fn = this.filters[filter];
return fn ? fn(item) : true;
},
destroyItem: function (item) {
var i = this.items.indexOf(item);
if (i > -1) {
this.splice('items', i, 1);
}
},
clearCompletedItems: function () {
this.items = this.items.filter(this.filters.active);
},
setItemsCompleted: function (completed) {
for (var i = 0; i < this.items.length; ++i) {
this.set([
'items',
i,
'isCompleted'
], completed);
}
},
filters: {
active: function (item) {
return !item.isCompleted;
},
completed: function (item) {
return item.isCompleted;
}
}
});
}());
(function () {
'use strict';
Polymer({
is: 'td-item',
extends: 'li',
properties: {
editing: {
type: Boolean,
value: false
},
item: {
type: Object,
value: function () {
return {};
}
}
},
observers: ['setHostClass(item.isCompleted, editing)'],
setHostClass: function (isCompleted, editing) {
this.toggleClass('completed', isCompleted);
this.toggleClass('editing', editing);
},
_onBlur: function () {
this._commitAction();
this.editing = false;
},
_editAction: function () {
this.editing = true;
this._editingValue = this.item.label;
this.async(function () {
this.querySelector('#edit').focus();
});
},
_commitAction: function () {
if (this.editing) {
this.editing = false;
this.set('item.label', this._editingValue.trim());
if (this.item.label === '') {
this._destroyAction();
}
}
},
_cancelAction: function () {
this.editing = false;
},
_destroyAction: function () {
this.fire('td-destroy-item', this.item);
}
});
}());
(function () {
'use strict';
Polymer({
is: 'td-todos',
properties: {
items: { type: Array },
model: { type: Object },
modelId: { type: String },
route: { type: String },
allCompleted: {
type: Boolean,
computed: '_computeAllCompleted(anyCompleted, activeCount)'
},
activeCount: {
type: Number,
computed: '_computeActiveCount(items, items.*)'
},
anyCompleted: {
type: Boolean,
computed: '_computeAnyCompleted(items, items.*)'
}
},
attached: function () {
this.model = document.querySelector('#' + this.modelId);
},
_computeLinkClass: function (currRoute, route) {
return currRoute === route ? 'selected' : '';
},
_computeAnyCompleted: function (items) {
return this.model ? this.model.getCompletedCount() > 0 : false;
},
_computeActiveCount: function (items) {
return this.model ? this.model.getActiveCount() : 0;
},
_computeAllCompleted: function (anyCompleted, activeCount) {
return anyCompleted && !activeCount;
},
_computeItemsLeft: function (count) {
return count < 2 ? 'item' : 'items';
},
matchesFilter: function (route) {
return function (item, index, array) {
return this.model ? this.model.matchesFilter(item, route) : false;
}.bind(this);
},
addTodoAction: function () {
this.model.newItem(this.$['new-todo'].value);
this.$['new-todo'].value = '';
},
cancelAddTodoAction: function () {
this.$['new-todo'].value = '';
},
destroyItemAction: function (e, detail) {
this.model.destroyItem(detail);
},
toggleAllCompletedAction: function (e) {
this.model.setItemsCompleted(e.target.checked);
},
clearCompletedAction: function () {
this.model.clearCompletedItems();
}
});
}());