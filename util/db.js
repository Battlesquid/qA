const firebase = require('firebase');
firebase.initializeApp(JSON.parse(process.env.CONFIG));

module.exports = {
    db: {
        set(location, value) {
            return firebase.database().ref(location).set(value);
        },
        get(location, event) {
            return firebase.database().ref(location).once(event);
        }
    }
}