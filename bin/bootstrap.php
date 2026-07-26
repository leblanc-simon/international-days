<?php

// Fuseau commun à tous les points d'entrée PHP.
//
// Celui du serveur n'est pas garanti — beaucoup d'hébergeurs laissent PHP en
// UTC — et il décide ici de ce qu'est « aujourd'hui » : sans cette ligne, les
// journées affichées basculent à 2 h du matin heure française (1 h en hiver)
// au lieu de minuit, et l'application signale à tort des données périmées
// pendant ce créneau.
date_default_timezone_set('Europe/Paris');
