// Accès à l'API PHP, servie sur la même origine que le build.
const apiBaseUrl = ''

/**
 * Récupère et décode une réponse JSON de l'API.
 *
 * `fetch` ne rejette que sur une panne réseau : un 4xx ou un 5xx arrive
 * comme une réponse ordinaire. On lève donc explicitement sur `!ok`, sinon
 * une API en erreur passerait pour un succès et les composants afficheraient
 * un contenu vide plutôt que leur message d'indisponibilité.
 */
export const getJson = async path => {
    const response = await fetch(apiBaseUrl + path)

    if (!response.ok) {
        throw new Error('Réponse HTTP ' + response.status + ' pour ' + path)
    }

    return response.json()
}
