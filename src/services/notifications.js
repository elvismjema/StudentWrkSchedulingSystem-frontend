// Mock notification data service
const mockNotifications = [
  {
    id: 1,
    title: 'Shift',
    description: 'Your shift at the brew starts real soon...',
    timestamp: 'Mar 1, 12:43 PM',
    unread: true,
    type: 'shift',
    icon: 'mdi-clock'
  },
  {
    id: 2,
    title: 'Swap Request',
    description: 'Emma Davis wants to swap shifts with you for tomorrow evening',
    timestamp: 'Mar 1, 8:43 AM',
    unread: true,
    type: 'swap',
    icon: 'mdi-swap-horizontal'
  },
  {
    id: 3,
    title: 'New Schedule Available',
    description: 'Next week\'s schedule has been published. Please review and acknowledge.',
    timestamp: 'Feb 27, 1:43 PM',
    unread: false,
    type: 'schedule',
    icon: 'mdi-calendar'
  }
]

class NotificationService {
  static getNotifications() {
    return Promise.resolve([...mockNotifications])
  }

  static getUnreadCount() {
    return Promise.resolve(mockNotifications.filter(n => n.unread).length)
  }

  static markAllAsRead() {
    mockNotifications.forEach(notification => {
      notification.unread = false
    })
    return Promise.resolve(true)
  }

  static markAsRead(notificationId) {
    const notification = mockNotifications.find(n => n.id === notificationId)
    if (notification) {
      notification.unread = false
    }
    return Promise.resolve(true)
  }
}

export default NotificationService
