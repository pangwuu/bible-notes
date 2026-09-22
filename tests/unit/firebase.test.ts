import { app, auth, db, firebaseConfig } from '../../src/services/firebase';

describe('Firebase Service Initialization', () => {
  test('initializes default Firebase App with bible-notes-sweedish credentials', () => {
    expect(app).toBeDefined();
    expect(app.name).toBe('[DEFAULT]');
    expect(app.options.projectId).toBe('bible-notes-sweedish');
    expect(app.options.apiKey).toBe('AIzaSyC_sKH5ZPgT0J6ZvvB5isV0KIDi8xBNleE');
    expect(app.options.appId).toBe('1:641152478914:web:d2e49874c858749015955b');
  });

  test('initializes Auth instance attached to default App', () => {
    expect(auth).toBeDefined();
    expect(auth.app.name).toBe('[DEFAULT]');
  });

  test('initializes Firestore instance attached to default App', () => {
    expect(db).toBeDefined();
    expect(db.type).toBe('firestore');
    expect(db.app.options.projectId).toBe('bible-notes-sweedish');
  });

  test('firebaseConfig matches live project constants', () => {
    expect(firebaseConfig.projectId).toBe('bible-notes-sweedish');
    expect(firebaseConfig.authDomain).toBe('bible-notes-sweedish.firebaseapp.com');
  });
});
