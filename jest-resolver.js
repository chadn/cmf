const path = require('path')

module.exports = (request, options) => {
    if (request.startsWith('nuqs')) {
        const [, ...rest] = request.split('/')
        const subPath = rest.join('/') || 'index'
        const nuqsPath = path.dirname(require.resolve('nuqs'))
        return path.join(nuqsPath, 'dist', `${subPath}.js`)
    }
    return options.defaultResolver(request, options)
}
