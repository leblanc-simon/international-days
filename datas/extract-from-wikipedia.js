
// https://fr.wikipedia.org/wiki/Journ%C3%A9e_internationale

let internationalDayFn;

internationalDayFn = () => {
    let internationalDays = {};
    let currentMonth;

    const parseInternationalDaysForMonth = (month, node) => {
        let lis = node.querySelectorAll(':scope > li');

        for (let iterator = 0, nbItems = lis.length; iterator < nbItems; ++iterator) {
            const li = lis[iterator].cloneNode(true);

            let date = null,
                name = null,
                content = null
            ;

            let subUlNode = li.querySelector(':scope > ul');

            if (!subUlNode) {
                content = li.innerText.split(':');
                if (content.length > 1) {
                    date = content.shift().trim();
                    name = content.join(':').trim();
                }

                internationalDays[month].push({
                    text: li.innerText.trim(),
                    date: date,
                    name: name,
                });

                continue;
            }

            let subInternationalDays = [];
            subUlNode.querySelectorAll(':scope > li').forEach(subLi => {
                subInternationalDays.push(subLi.innerText.trim());
            });

            li.querySelector(':scope > ul').remove();
            date = li.innerText.replace(':', '').trim();

            subInternationalDays.forEach(subInternationalDay => {
                internationalDays[month].push({
                    text: subInternationalDay,
                    date: date,
                    name: subInternationalDay,
                });
            });
        }
    };

    const baseDiv = document.querySelector('#mw-content-text > div');

    // On supprime toutes les références
    let referenceNodes = baseDiv.querySelectorAll('sup.reference');
    referenceNodes.forEach(referenceNode => {
        referenceNode.remove();
    });

    let child = baseDiv.firstChild;
    let count = 0;
    parseDom:
    while (child) {
        switch (child.tagName) {
            case 'H3':
                currentMonth = child.querySelector('.mw-headline[id]').id;
                internationalDays[currentMonth] = [];
                break;
            case 'UL':
                parseInternationalDaysForMonth(currentMonth, child);
                break;
            case 'DIV':
                if (child.classList.contains('references-small')) {
                    break parseDom;
                }
                if (child.classList.contains('mw-heading3') && child.querySelector('h3')) {
                    currentMonth = child.querySelector('h3').id;
                    internationalDays[currentMonth] = [];
                }
                break;
        }

        child = child.nextSibling;
    }

    //console.log(internationalDays);
    return internationalDays;
};

cleanData = internationalDays => {
    let cleanInternationalDays = [];
    const numericMonths = {
        'Janvier': 1,
        'Février': 2,
        'Mars': 3,
        'Avril': 4,
        'Mai': 5,
        'Juin': 6,
        'Juillet': 7,
        'Août': 8,
        'Septembre': 9,
        'Octobre': 10,
        'Novembre': 11,
        'Décembre': 12,
    };
    const months = {
        'Janvier': 'january',
        'Février': 'february',
        'Mars': 'march',
        'Avril': 'april',
        'Mai': 'may',
        'Juin': 'june',
        'Juillet': 'july',
        'Août': 'august',
        'Septembre': 'september',
        'Octobre': 'october',
        'Novembre': 'november',
        'Décembre': 'december',
    };
    const days = {
        'lundi': 'monday',
        'mardi': 'tuesday',
        'mercredi': 'wednesday',
        'jeudi': 'thursday',
        'vendredi': 'friday',
        'samedi': 'saturday',
        'dimanche': 'sunday',
    }
    const ordinals = {
        'premier': 'first',
        '1er': 'first',
        '1e': 'first',
        'dernier': 'last',
        '2e': 'second',
        '3e': 'third',
        '4e': 'fourth',
    };
    // Corrections manuelles, pour les journées que l'article ne date pas du
    // tout. La clé est le nom exact de la journée. Prime sur le reste.
    // Cf. la constante OVERRIDES de bin/update-datas.php.
    const overrides = {
        // L'article indique seulement « En juin ». La date réelle change
        // chaque année selon les éditions du GACG (6, 7, 10 ou 13 juin
        // suivant les années) : on retient le 6 juin, date d'origine.
        'journée mondiale anti-contrefaçon': { day: 6 },
    };

    // Ramène les dates approximatives de l'article à une forme analysable :
    //   « À partir du 20 avril »     -> « 20 avril »
    //   « Équinoxe (20 ou 21 mars) » -> « 20 mars »
    //   « 6 / 8 février »            -> « 6 février »
    // Quand la page hésite entre plusieurs jours, on retient le premier.
    const normalizeDate = date => {
        // Préfixes qui n'apportent pas de date.
        date = date.replace(/^(?:à partir du|à partir de|vers le|le)\s+/i, '');

        // Précision entre parenthèses : c'est elle qui porte la date.
        const parenthesis = date.match(/\(([^)]*[0-9][^)]*)\)/);
        if (parenthesis) {
            date = parenthesis[1].trim();
        }

        // Jour incertain ou plage de jours : on garde le premier.
        date = date.replace(/^([0-9]+)(?:\s*(?:ou|\/|-|–|et|à)\s*[0-9]+)+/, '$1');

        return date.trim();
    };

    for (let month in internationalDays) {
        let currentMonth = numericMonths[month];
        let datas = internationalDays[month];

        const dateRegex = new RegExp('^([0-9]+)(er)?\\s' + month, 'i');
        const ordinalRegex = new RegExp('^(' + Object.keys(ordinals).join('|') + ')\\s(' + Object.keys(days).join('|') + ')', 'i');
        const weekendRegex = new RegExp('^(' + Object.keys(ordinals).join('|') + ')\\s+week[- ]?end', 'i');

        datas.forEach(internationalDay => {
            internationalDay.month = currentMonth;

            // Correction manuelle : prime sur ce que dit la page.
            if (internationalDay.name && overrides[internationalDay.name]) {
                Object.assign(internationalDay, overrides[internationalDay.name]);

                return;
            }

            if (!internationalDay.date) {
                console.warn(internationalDay);

                return;
            }

            // « 28 ou 29 février » : dernier jour du mois, qui dépend de
            // l'année bissextile -> date relative, résolue à l'année courante
            // par build-cache.php. Février est le seul mois de longueur
            // variable.
            if (/^28\s*(?:ou|\/|-)\s*29\s+février$/i.test(internationalDay.date)) {
                internationalDay.customDay = 'last day of february';

                return;
            }

            const date = normalizeDate(internationalDay.date);

            if (dateRegex.test(date)) {
                internationalDay.day = parseInt(date.match(dateRegex)[1], 10);

                return;
            }

            if (ordinalRegex.test(date)) {
                const match = date.match(ordinalRegex);
                const ordinal = match[1];
                const day = match[2];
                internationalDay.customDay = ordinals[ordinal.toLowerCase()] + ' ' + days[day.toLowerCase()] + ' of ' + months[month];

                return;
            }

            // Week-end (le mois reste souvent implicite dans la page) : on
            // retient le samedi, premier jour du week-end.
            if (weekendRegex.test(date)) {
                const ordinal = date.match(weekendRegex)[1];
                internationalDay.customDay = ordinals[ordinal.toLowerCase()] + ' saturday of ' + months[month];

                return;
            }

            console.warn(internationalDay);
        });

        cleanInternationalDays = cleanInternationalDays.concat(datas);
    }

    return [cleanInternationalDays, internationalDays];
};

cleanData(internationalDayFn());

