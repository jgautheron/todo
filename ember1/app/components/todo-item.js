import Ember from 'ember';

export default Ember.Component.extend({
  isEditing: false,

  keyUp(ev) {
    var target = ev.target;
    if (ev.keyCode === 13 && target.className === 'edit') {
      var id = $(target).parents('li[data-id]').attr('data-id');
      this.set('isEditing', false);
      this.sendAction('updateItem', id, target.value);
    }
  },

  actions: {
    editItem(item) {
      this.set('isEditing', true);
    },

    removeItem(item) {
      this.sendAction('removeItem', item.get('id'));
    },

    isCompleted(item) {
      this.sendAction('isCompleted', item.get('id'));
    },
  }
});
