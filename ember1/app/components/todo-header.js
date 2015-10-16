import Ember from 'ember';

export default Ember.Component.extend({
  keyUp(ev) {
    var target = ev.target;
    if (ev.keyCode === 13 && target.className === 'new-todo') {
      // bubble the action up to the controller
      this.sendAction('addItem', target.value);

      // empty the input field
      target.value = '';
    }
  }
});
