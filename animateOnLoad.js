'use strict';

/*
The Motion Path Polyfill implements Web Animations for:
- Motion Path properties
    https://drafts.fxtf.org/motion-1/
- Individual Transform Properties
    https://drafts.csswg.org/css-transforms-2/#individual-transforms

The polyfill doesn't consider stylesheets or inline styles,
hence this file.

If we have stylesheets or inline styles that use the polyfilled properties,
we can identify the relevant elements and create fill: forwards animations.

FIXME: We currently don't detect any DOM or stylesheet changes that occur
after load, and we don't honour the selector specificity rules.
*/

window.onload = function() {
  function camelCase(property) {
    var hyphen = property.indexOf('-');
    if (hyphen === -1) {
      return property;
    }
    return (
      property.substring(0, hyphen) +
      property.substring(hyphen + 1, hyphen + 2).toUpperCase() +
      property.substring(hyphen + 2));
  }

  var polyfilledProperties = {};
  [
    'offset-anchor',
    'offset-distance',
    'offset-path',
    'offset-position',
    'offset-rotate',
    'rotate',
    'scale',
    'translate'
  ].forEach(function(property) {
    polyfilledProperties[property] = camelCase(property);
  });

  function motionPathKeyframe(declarations) {
    var declarations = declarations.split(';');

    var keyframe = {};
    declarations.forEach(function(declaration) {
      declaration = declaration.split(':');
      var property = declaration[0].trim();
      if (property in polyfilledProperties)
        keyframe[polyfilledProperties[property]] = declaration[1].trim();
    });
    return keyframe;
  }

  var timing = {duration: 0, fill: 'forwards'};

  function processRuleset(ruleset) {
    ruleset = ruleset.split('{');
    if (ruleset.length !== 2)
      return;
    var selectors = ruleset[0];
    var elementList = document.querySelectorAll(selectors);
    if (elementList.length === 0)
      return;

    var keyframe = motionPathKeyframe(ruleset[1]);
    if (Object.keys(keyframe).length === 0)
      return;

    var keyframes = [keyframe, keyframe];
    elementList.forEach(function(element) {
      element.animate(keyframes, timing);
    });
  }

  function applyStyleSheets() {
    var styleElements = document.getElementsByTagName('style');
    for (var i = 0; i < styleElements.length; ++i) {
      var styleElement = styleElements[i];
      // Replace comments with whitepace.
      var textContent = styleElement.textContent.replace(/\/\*.*?\*\//g, ' ');

      // For now, we assume the stylesheet contains rulesets only.
      var rulesets = textContent.split('}');
      rulesets.pop(); // Ignore everything after the final }
      rulesets.forEach(processRuleset);
    }
  }

  var pending = [];

  function readInlineStyles() {
    var inlineStyledElements = document.querySelectorAll('[style]');
    for (var i = 0; i < inlineStyledElements.length; ++i) {
      var inlineStyledElement = inlineStyledElements[i];
      // Replace comments with whitepace.
      var declarations = inlineStyledElement.getAttribute('style').replace(/\/\*.*?\*\//g, ' ');
      var keyframe = motionPathKeyframe(declarations);
      if (Object.keys(keyframe).length === 0)
        continue;

      pending.push([inlineStyledElement, keyframe]);
    }
  }

  function applyInlineStyles() {
    for (var i = 0; i < pending.length; ++i) {
      var inlineStyledElement = pending[i][0];
      var keyframe = pending[i][1];
      var keyframes = [keyframe, keyframe];
      inlineStyledElement.animate(keyframes, timing);
    }
  }

  readInlineStyles();
  applyStyleSheets();
  applyInlineStyles();
};
