(function () {
  "use strict";

  angular.module('flickrSearchEngine', [])
  .service('flickrService',
      ['$log', '$http', '$sce', function ($log, $http, $sce) {
        var self = this;
        var baseSearchEndpoint = "https://api.flickr.com/services/feeds/photos_public.gne";
        var trustedUrl = $sce.trustAsResourceUrl(baseSearchEndpoint);

        self.query = function (queryString) {

          // replace whitespace with commas, ensuring to encode uri characters along
          // the way
          var tagQuery = queryString
          .split(/\s+/)
          .map(function (s) {
            return encodeURIComponent(s);
          })
          .join(',');

          var params = {
            format: "json",
            tags: tagQuery
          };

          var promise = $http.jsonp(trustedUrl, {
            params: params,
            jsonpCallbackParam: "jsoncallback"
          }).then(
              function (response) {
                var results = [];
                response.data.items.forEach(function (item) {
                  var tags = item.tags
                  .split(/\s+/)
                  .map(function (tag) {
                    return '#' + tag;
                  })
                  .join(' ');

                  var authorRegEx = /nobody@flickr.com \("(.+)"\)/;
                  var match = item.author.match(authorRegEx);
                  var author = match.length === 2 ? match[1] : match[0];

                  // NOTE: API doesn't return thumbnail or hi-res links, but
                  // manipulating the file name works around this
                  results.push({
                    thumbnail: item.media.m.replace('_m.', '_q.'),
                    large: item.media.m.replace('_m.', '_b.'),
                    author: author,
                    tags: tags,
                    title: item.title
                  });
                });

                return results;
              },
              function (response) {
                $log.warn("Request failed with status " +
                    response.status +
                    " for " +
                    trustedUrl);
              }
          );
          return promise;
        };
      }])
  .controller('mainCntrl', function () {
    this.searchQuery = "";
  })
  .component('gallery', {
    template: '<h4>{{$ctrl.heading}}</h4>' +
    '<image-card ng-repeat="item in $ctrl.results" image-meta="item">' +
    '</image-card>',
    bindings: {
      searchQuery: '<'
    },
    controller: ['$log', 'flickrService', function ($log, flickrService) {
      var vm = this;

      vm.heading = "";
      vm.results = [];

      vm.$onChanges = function (changes) {
        if (changes.searchQuery) {
          refresh();
        }
      };

      function refresh() {
        if (vm.searchQuery && vm.searchQuery.trim()) {
          $log.debug("searching for " + vm.searchQuery);

          vm.heading = 'Loading...';

          flickrService.query(vm.searchQuery).then(
              function (response) {
                $log.debug("Received response " + response);
                vm.results = response;
                vm.heading = vm.results && vm.results.length > 0 ?
                    "Recent uploads tagged '" + vm.searchQuery + "'" :
                    "No recent uploads found for '" + vm.searchQuery + "'";
              });
        } else {
          $log.debug("Clearing results");
          vm.results = [];
          vm.heading = "";
        }
      }
    }
    ]
  })
  .component('imageCard', {
    template: '<div">' +
    '<a ng-href="{{$ctrl.imageMeta.large}}" target="_blank">' +
    '<img ng-src="{{$ctrl.imageMeta.thumbnail}}"/>' +
    '</a>' +
    '<div class="thumbdetail">' +
    '<div title="{{$ctrl.imageMeta.title}}">' +
    '<p class="title">{{$ctrl.imageMeta.title}}</p>' +
    '</div>' +
    '<div title="{{$ctrl.imageMeta.author}}">' +
    '<p class="author">by {{$ctrl.imageMeta.author}}</p>' +
    '</div>' +
    '<div title="{{$ctrl.imageMeta.tags}}">' +
    '<p class="tags">{{$ctrl.imageMeta.tags}}</p>' +
    '</div>' +
    '</div>' +
    '</div>',
    bindings: {
      imageMeta: '<'
    }
  });
}());