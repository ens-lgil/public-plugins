/*
 * Copyright [1999-2014] Wellcome Trust Sanger Institute and the EMBL-European Bioinformatics Institute
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *      http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

Ensembl.Panel.Content = Ensembl.Panel.Content.extend({
  init: function () {
    this.base();
    
    if (this.el.parent().hasClass('image_panel') && this.panelType !== 'ImageMap') {
      this.imagePanel = true; // Panels which would be image maps if the region wasn't too large
    }
  },
  
  hashChange: function () {
    if (this.imagePanel && Ensembl.location.length > Ensembl.maxRegionLength) {
      return;
    }
    
    this.base.apply(this, arguments);
  }
});

Ensembl.Panel.ImageMap = Ensembl.Panel.ImageMap.extend({
  init: function () {
    var panel = this;
    
    this.base();
    
    this.el.css('position', 'relative');
    
    if (this.params.genoverseSwitch) {
      var isStatic = panel.params.updateURL.match('static');
      
      $('<div class="genoverse_switch"></div>').appendTo($('.image_toolbar', this.el)).on('click', function () {
        panel.params.updateURL = Ensembl.updateURL({ 'static': !isStatic }, panel.params.updateURL);
        panel.getContent();
        
        $.ajax({
          url  : '/' + Ensembl.species + '/Genoverse/switch_image',
          data : { 'static' : isStatic ? 0 : 1, id : panel.id }
        });
      }).helptip({ content: 'Switch to ' + (isStatic ? 'scrollable' : 'static') + ' image' });
    } else {
      this.elLk.overlay       = $('<div class="image_update_overlay">');
      this.elLk.updateButtons = $('<div class="image_update_buttons">');
      
      $('<input class="fbutton update" type="button" value="Update this image" /><input class="fbutton reset" type="button" value="Reset scrollable image" />').appendTo(this.elLk.updateButtons).on('click', function () {
        if ($(this).hasClass('update')) {
          panel.params.updateURL = Ensembl.urlFromHash(panel.params.updateURL);
          panel.getContent();
        } else {
          var location = panel.highlightRegions[0][0].region.range;
          panel.resetGenoverse = true;
          
          Ensembl.EventManager.trigger('genoverseMove', location.start, location.end, true, true);
          panel.elLk.overlay.add(panel.elLk.updateButtons).detach();
          panel.elLk.container.resizable('enable');
        }
      });
    }
    
    Ensembl.EventManager.register('resetImageOffset', this, function () { delete this.imgOffset; });
  },
  
  hashChange: function () {
    if (this.resetGenoverse) {
      this.resetGenoverse = false;
    } else if (Ensembl.genoverseScroll && !this.params.genoverseSwitch) {
      var range = this.highlightRegions[0][0].region.range;
      
      if (range.start > Ensembl.location.start || range.end < Ensembl.location.end) {
        this.elLk.overlay.prependTo(this.el).css({ width: this.elLk.container.outerWidth(), height: this.elLk.container.outerHeight() });
        this.elLk.container.append(this.elLk.updateButtons);
        this.elLk.container.resizable('disable');
      }
    } else {
      this.base.apply(this, arguments);
    }
  }
});

Ensembl.Panel.Configurator = Ensembl.Panel.Configurator.extend({
  updateConfiguration: function () {
    if (this.params.reset && this.params.reset !== 'track_order') {
      Ensembl.EventManager.triggerSpecific('resetGenoverse', this.component);
    }
    
    return this.base.apply(this, arguments);
  }
});

Ensembl.Panel.LocationNav = Ensembl.Panel.LocationNav.extend({
  init: function () {
    var panel = this;
    
    this.base();
    
    this.elLk.r = this.elLk.forms.children('input[name=r]');
    
    this.elLk.r.parent().on('submit', function () {
      return panel.formSubmit();
    }).find('a.go-button').off().on('click', function () {
      return panel.formSubmit();
    });
  },
  
  formSubmit: function () {
    var panel = this;
    var r     = this.elLk.r.val();
    
    if (r) {
      r = r.split(/[:-]/);
      
      if (!r[0]) {
        return false;
      }
      
      r = r[0] + ':' + (r[1] || 1) + '-' + (r[2] || 1);
      
      $.ajax({
        url: Ensembl.updateURL({ r: r, update_panel: 1 }, this.elLk.updateURL.val()),
        dataType: 'json',
        success: function (json) {
          if (json[2] !== Ensembl.coreParams.r) {
            return Ensembl.updateLocation(json[2]);
          }
          
          var sliderValue = json.shift();
          
          if (panel.elLk.slider.slider('value') !== sliderValue) {
            panel.elLk.slider.slider('option', 'force', true);
            panel.elLk.slider.slider('value', sliderValue);
            panel.elLk.slider.slider('option', 'force', false);
          }
          
          panel.elLk.updateURL.val(json.shift());
          panel.elLk.locationInput.val(json.shift());
          
          panel.elLk.navLinks.attr('href', function () {
            return this.href.replace(Ensembl.locationReplace, '$1$2' + json.shift() + '$3');
          });
        }
      });
    }
    
    return false;
  }
});
