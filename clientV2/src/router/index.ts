import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";
import { useGameStore } from "../stores/game";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/map",
      name: "map",
      component: () => import("../views/MapView.vue"),
    },
    {
      path: "/profile",
      name: "profile",
      component: () => import("../views/ProfileView.vue"),
    },
  ],
});

router.beforeEach((to, from, next) => {
  const store = useGameStore();

  if (to.name === 'home' && store.token) {
    next({ name: 'map' });
  }
  else if (to.name === 'map' && !store.token) {
    next({ name: 'home' });
  }
  else {
    next();
  }
});

export default router;
