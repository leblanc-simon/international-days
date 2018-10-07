
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
    };

    for (let month in internationalDays) {
        let currentMonth = numericMonths[month];
        let datas = internationalDays[month];

        const dateRegex = new RegExp('^([0-9]+)(er)?\\s' + month, 'i');
        const ordinalRegex = new RegExp('^(' + Object.keys(ordinals).join('|') + ')\\s(' + Object.keys(days).join('|') + ')', 'i');

        datas.forEach(internationalDay => {
            internationalDay.month = currentMonth;

            if (!internationalDay.date) {
                return;
            }
            
            if (dateRegex.test(internationalDay.date)) {
                internationalDay.day = parseInt(internationalDay.date.match(dateRegex)[1], 10);
                
                return;
            }

            if (ordinalRegex.test(internationalDay.date)) {
                const match = internationalDay.date.match(ordinalRegex);
                const ordinal = match[1];
                const day = match[2];
                internationalDay.customDay = ordinals[ordinal.toLowerCase()] + ' ' + days[day.toLowerCase()] + ' of ' + months[month];

                return;
            }
        });

        cleanInternationalDays = cleanInternationalDays.concat(datas);
    }

    return [cleanInternationalDays, internationalDays];
};

cleanData(internationalDayFn());

