(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        // AMD. Register as an anonymous module.
        define(['bean', 'underscore', 'hammer'], function (bean, _, Hammer) {
            // Also create a global in case some scripts
            // that are loaded still are looking for
            // a global even when an AMD loader is in use.
            return (root.Flotr = factory(bean, _, Hammer));
        });
    } else {
        // Browser globals
        root.Flotr = factory(root.bean, root._, root.hammer);
    }
}(this, function (bean, _, Hammer) {

