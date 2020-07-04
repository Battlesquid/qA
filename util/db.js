const firebase = require('firebase');
firebase.initializeApp(JSON.parse(process.env.CONFIG));

module.exports = {
    set(location, value) {
        try {
            return firebase.database().ref(location).set(value);
        } catch (e) { return console.log(e); }
    },
    get(location, event) {
        try {
            return firebase.database().ref(location).once(event);
        } catch (e) { return console.log(e); }
    },
    delete(location) {
        try {
            return firebase.database().ref(location).remove();
        } catch (e) { return console.log(e); }
    }
}