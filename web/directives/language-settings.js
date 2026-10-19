module.exports = function (pseudotv) {
    return {
        restrict: 'E', templateUrl: 'templates/language-settings.html', replace: true, scope: {},
        link: function (scope) {
            scope.saved = false
            pseudotv.getLanguageSettings().then(settings => { scope.settings = settings })
            scope.save = function () {
                scope.saved = false
                pseudotv.updateLanguageSettings(scope.settings).then(settings => {
                    scope.settings = settings
                    scope.saved = true
                }, err => { scope.error = (err.data && err.data.error) || 'Unable to save' })
            }
        }
    }
}
