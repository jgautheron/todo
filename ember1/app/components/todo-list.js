import Ember from 'ember';

export default Ember.Component.extend({
  checked: false,

  actions: {
    updateItem(id, label) {
      // proxy the action to the controller
      this.sendAction('updateItem', id, label);
    },

    removeItem(id) {
      // proxy the action to the controller
      this.sendAction('removeItem', id);
    },

    isCompleted(id) {
      // proxy the action to the controller
      this.sendAction('isCompleted', id);
    },

    toggleAll() {
      var nxtVal = !this.get('checked');
      // send the action to the controller
      this.set('checked', nxtVal);
      this.sendAction('toggleAll', nxtVal);
    }
  },
});
