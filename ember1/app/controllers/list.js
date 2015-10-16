import Ember from 'ember';

export default Ember.Controller.extend({
  actions: {
    addItem(val) {
      var item = this.store.createRecord('item', {
        label: val
      });

      // persist the record
      item.save();
    },

    updateItem(id, label) {
      this.store.findRecord('item', id).then(function(post) {
        post.set('label', label);
        post.save();
      });
    },

    removeItem(id) {
      this.store.findRecord('item', id).then(function(post) {
        post.deleteRecord();
        post.save();
      });
    },

    isCompleted(id) {
      this.store.findRecord('item', id).then(function(post) {
        post.set('isCompleted', !post.get('isCompleted'));
        post.save();
      });
    },

    clearCompleted() {
      this.store.query('item', { isCompleted: true }).then(function(items) {
        items.forEach(function(item) {
          if (item.get('isCompleted')) {
            item.deleteRecord();
            item.save();
          }
        });
      });
    },

    toggleAll(nxtVal) {
      this.model.forEach(function(item) {
        item.set('isCompleted', nxtVal);
        item.save();
      });
    },
  }
});
