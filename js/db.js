/*
  Happyologie on-device storage.

  Everything a user writes (journal entries, saved cards) stays in IndexedDB,
  in the browser, on this device. Nothing here talks to a server. That's the
  brand promise ("only you can see it") and it's a hard rule for this file.

  IndexedDB instead of localStorage because localStorage is the first thing
  Safari clears under storage pressure; IndexedDB + a persistent-storage
  request survives far more cleanup scenarios (see requestPersistence below).
*/

var HappyDB = (function () {
  var DB_NAME = "happyologie";
  var DB_VERSION = 1;
  var JOURNAL_STORE = "journal";
  var SHELF_STORE = "shelf";
  var LS_JOURNAL_KEY = "hpl-journal";
  var LS_SHELF_KEY = "hpl-shelf";
  var LS_MIGRATED_KEY = "hpl-migrated-idb";

  var dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!window.indexedDB) {
        reject(new Error("IndexedDB not supported"));
        return;
      }
      var req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function (e) {
        var db = e.target.result;
        if (!db.objectStoreNames.contains(JOURNAL_STORE)) {
          db.createObjectStore(JOURNAL_STORE, { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains(SHELF_STORE)) {
          var shelf = db.createObjectStore(SHELF_STORE, { keyPath: "id", autoIncrement: true });
          shelf.createIndex("savedAt", "savedAt");
        }
      };
      req.onsuccess = function (e) { resolve(e.target.result); };
      req.onerror = function (e) { reject(e.target.error); };
    });
    return dbPromise;
  }

  function tx(storeName, mode) {
    return openDB().then(function (db) {
      return db.transaction(storeName, mode).objectStore(storeName);
    });
  }

  function reqToPromise(req) {
    return new Promise(function (resolve, reject) {
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
  }

  // ---- journal ----

  function saveJournalEntry(date, text) {
    return tx(JOURNAL_STORE, "readwrite").then(function (store) {
      return reqToPromise(store.put({ date: date, text: text, updatedAt: Date.now() }));
    });
  }

  function getJournalEntry(date) {
    return tx(JOURNAL_STORE, "readonly").then(function (store) {
      return reqToPromise(store.get(date));
    }).then(function (row) { return row ? row.text : null; });
  }

  function getAllJournal() {
    return tx(JOURNAL_STORE, "readonly").then(function (store) {
      return reqToPromise(store.getAll());
    });
  }

  function getJournalCount() {
    return tx(JOURNAL_STORE, "readonly").then(function (store) {
      return reqToPromise(store.count());
    });
  }

  // ---- shelf ----

  function getShelf() {
    return tx(SHELF_STORE, "readonly").then(function (store) {
      return reqToPromise(store.getAll());
    }).then(function (rows) {
      return rows.sort(function (a, b) { return b.savedAt - a.savedAt; });
    });
  }

  function addShelfItem(item) {
    return getShelf().then(function (existing) {
      var dup = existing.some(function (s) { return s.text === item.text; });
      if (dup) return null;
      return tx(SHELF_STORE, "readwrite").then(function (store) {
        var row = { deck: item.deck, text: item.text, when: item.when, savedAt: Date.now() };
        return reqToPromise(store.add(row));
      });
    });
  }

  function removeShelfItem(id) {
    return tx(SHELF_STORE, "readwrite").then(function (store) {
      return reqToPromise(store.delete(id));
    });
  }

  // ---- persistence ----

  // Asks the browser not to silently evict this site's storage under
  // pressure. Best-effort: Safari and Firefox may still say no, but asking
  // costs nothing and helps on Chrome/Android and installed iOS PWAs.
  function requestPersistence() {
    if (navigator.storage && navigator.storage.persist) {
      return navigator.storage.persist();
    }
    return Promise.resolve(false);
  }

  function isPersisted() {
    if (navigator.storage && navigator.storage.persisted) {
      return navigator.storage.persisted();
    }
    return Promise.resolve(false);
  }

  // ---- one-time migration from the old localStorage prototype ----

  function migrateFromLocalStorage() {
    if (localStorage.getItem(LS_MIGRATED_KEY)) return Promise.resolve();

    var oldJournal = {};
    var oldShelf = [];
    try { oldJournal = JSON.parse(localStorage.getItem(LS_JOURNAL_KEY) || "{}"); } catch (e) {}
    try { oldShelf = JSON.parse(localStorage.getItem(LS_SHELF_KEY) || "[]"); } catch (e) {}

    var journalWrites = Object.keys(oldJournal).map(function (date) {
      return saveJournalEntry(date, oldJournal[date]);
    });

    // Preserve original save order (oldShelf is newest-first); savedAt
    // descends so the sort in getShelf() keeps that order.
    var base = Date.now();
    var shelfWrites = oldShelf.map(function (item, i) {
      return tx(SHELF_STORE, "readwrite").then(function (store) {
        return reqToPromise(store.add({
          deck: item.deck,
          text: item.text,
          when: item.when,
          savedAt: base - i
        }));
      });
    });

    return Promise.all(journalWrites.concat(shelfWrites)).then(function () {
      localStorage.setItem(LS_MIGRATED_KEY, "1");
      // Leave the old keys in place rather than deleting: harmless, and a
      // safety net if IndexedDB ever fails to open on a later visit.
    });
  }

  return {
    init: openDB,
    saveJournalEntry: saveJournalEntry,
    getJournalEntry: getJournalEntry,
    getAllJournal: getAllJournal,
    getJournalCount: getJournalCount,
    getShelf: getShelf,
    addShelfItem: addShelfItem,
    removeShelfItem: removeShelfItem,
    requestPersistence: requestPersistence,
    isPersisted: isPersisted,
    migrateFromLocalStorage: migrateFromLocalStorage
  };
})();
