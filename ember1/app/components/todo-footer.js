import Ember from 'ember';

export default Ember.Component.extend({
  // handle plural
  morethanOne: false,

  actions: {
    clearCompleted() {
      // transmit the action to the controller
      this.sendAction('clearCompleted');
    }
  },

  willRender() {
    if (this.items.get('length') > 1) {
      this.set('morethanOne', true);
    }
  }
});
