import Ember from 'ember';

export default Ember.Route.extend({
  setupController: function(controller, model) {
    controller.set('model', model);
  },

  model: function() {
    var items = this.store.findAll('item');
    return items;
  }
});
