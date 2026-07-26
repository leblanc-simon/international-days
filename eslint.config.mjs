import js from '@eslint/js'
import globals from 'globals'
import pluginVue from 'eslint-plugin-vue'
import stylistic from '@stylistic/eslint-plugin'

const production = process.env.NODE_ENV === 'production'

// Le préréglage « standard » (@vue/eslint-config-standard) ne suit pas encore
// ESLint 10 : les règles de style sont désormais composées ici, calquées sur
// ce que le projet appliquait auparavant (indentation 4 espaces, pas de
// point-virgule, guillemets simples).
export default [
    {
        ignores: ['dist/**', 'dev-dist/**', 'cache/**', 'public/**', 'datas/**']
    },

    js.configs.recommended,
    ...pluginVue.configs['flat/essential'],

    stylistic.configs.customize({
        indent: 4,
        quotes: 'single',
        semi: false,
        commaDangle: 'never',
        braceStyle: '1tbs',
        arrowParens: false,
        jsx: false
    }),

    {
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node
            }
        },
        rules: {
            // Les valeurs par défaut de @stylistic divergent de « standard »
            // sur ces cinq règles : on garde celles que le code suit déjà,
            // sinon un `--fix` réécrirait tous les fichiers.
            //
            //   `data () {}` et non `data() {}`
            '@stylistic/space-before-function-paren': ['error', 'always'],
            //   `month => {}` et non `(month) => {}`
            '@stylistic/arrow-parens': 'off',
            //   `'l\'orgasme'` reste en guillemets doubles si ça évite un échappement
            '@stylistic/quotes': ['error', 'single', {
                avoidEscape: true,
                allowTemplateLiterals: 'never'
            }],
            '@stylistic/quote-props': ['error', 'as-needed'],
            //   opérateur en fin de ligne, sauf pour le ternaire
            '@stylistic/operator-linebreak': ['error', 'after', {
                overrides: { '?': 'before', ':': 'before' }
            }],

            'no-console': production ? 'error' : 'off',
            'no-debugger': production ? 'error' : 'off'
        }
    },

    {
        // Volet non stylistique de « standard » : ces règles ne dépendent
        // d'aucun greffon, on les reprend telles qu'elles étaient appliquées
        // avant la migration.
        rules: {
            'accessor-pairs': ['error', { setWithoutGet: true, getWithoutSet: false, enforceForClassMembers: true }],
            'array-callback-return': ['error', { allowImplicit: false, checkForEach: false }],
            camelcase: ['error', { allow: ['^UNSAFE_'], properties: 'never', ignoreGlobals: true }],
            curly: ['error', 'multi-line'],
            'default-case-last': 'error',
            'dot-notation': ['error', { allowKeywords: true }],
            eqeqeq: ['error', 'always', { null: 'ignore' }],
            'new-cap': ['error', { newIsCap: true, capIsNew: false, properties: true }],
            'no-array-constructor': 'error',
            'no-caller': 'error',
            'no-eval': 'error',
            'no-extend-native': 'error',
            'no-extra-bind': 'error',
            'no-implied-eval': 'error',
            'no-iterator': 'error',
            'no-labels': ['error', { allowLoop: false, allowSwitch: false }],
            'no-lone-blocks': 'error',
            'no-multi-str': 'error',
            'no-new': 'error',
            'no-new-func': 'error',
            'no-new-wrappers': 'error',
            'no-object-constructor': 'error',
            'no-octal-escape': 'error',
            'no-proto': 'error',
            'no-return-assign': ['error', 'except-parens'],
            'no-self-compare': 'error',
            'no-sequences': 'error',
            'no-template-curly-in-string': 'error',
            'no-throw-literal': 'error',
            'no-undef-init': 'error',
            'no-unmodified-loop-condition': 'error',
            'no-unneeded-ternary': ['error', { defaultAssignment: false }],
            'no-unreachable-loop': 'error',
            'no-unused-expressions': ['error', {
                allowShortCircuit: true,
                allowTernary: true,
                allowTaggedTemplates: true
            }],
            'no-use-before-define': ['error', { functions: false, classes: false, variables: false }],
            'no-useless-call': 'error',
            'no-useless-computed-key': 'error',
            'no-useless-constructor': 'error',
            'no-useless-rename': 'error',
            'no-useless-return': 'error',
            'no-var': 'error',
            'no-void': 'error',
            'object-shorthand': ['error', 'properties'],
            'one-var': ['error', { initialized: 'never' }],
            'prefer-const': ['error', { destructuring: 'all', ignoreReadBeforeAssign: false }],
            'prefer-promise-reject-errors': 'error',
            'prefer-regex-literals': ['error', { disallowRedundantWrapping: true }],
            'symbol-description': 'error',
            'unicode-bom': ['error', 'never'],
            yoda: ['error', 'never'],

            // Volet stylistique des mêmes règles, passé sous @stylistic.
            '@stylistic/function-call-spacing': ['error', 'never'],
            '@stylistic/object-curly-newline': ['error', { multiline: true, consistent: true }],
            // allowMultiplePropertiesPerLine dans « standard » : l'option a
            // été renommée en allowAllPropertiesOnSameLine.
            '@stylistic/object-property-newline': ['error', { allowAllPropertiesOnSameLine: true }]
        }
    }
]
