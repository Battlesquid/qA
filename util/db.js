const firebase = require('firebase');
firebase.initializeApp(JSON.parse(process.env.CONFIG));

module.exports = {
    set(location, value) {
        return firebase.database().ref(location).set(value);
    },
    get(location, event) {
        return firebase.database().ref(location).once(event);
    },
    delete(location) {
        return firebase.database().ref(location).remove();
    }
}